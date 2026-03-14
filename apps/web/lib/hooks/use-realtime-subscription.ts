'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

/**
 * A generic React hook for subscribing to real-time updates from a Supabase table.
 * @param table The name of the table to subscribe to.
 * @param initialData The initial data to be displayed.
 * @param filter The filter to apply to the subscription, e.g., `organization_id=eq.123`
 * @returns The up-to-date data.
 */
export function useRealtimeSubscription<T extends { id: any }>(
  table: string,
  initialData: T[] = [],
  filter?: string
) {
  const [data, setData] = useState<T[]>(initialData);
  const supabase = createClient();

  useEffect(() => {
    // Initialize with the server-rendered data
    setData(initialData);

    const channel = supabase
      .channel(`realtime:${table}:${filter || 'all'}`)
      .on<T>(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter },
        (payload: RealtimePostgresChangesPayload<T>) => {
          if (payload.eventType === 'INSERT') {
            setData(currentData => [...currentData, payload.new as T]);
          }
          if (payload.eventType === 'UPDATE') {
            setData(currentData =>
              currentData.map(item =>
                item.id === (payload.new as T).id ? { ...item, ...payload.new } : item
              )
            );
          }
          if (payload.eventType === 'DELETE') {
            setData(currentData =>
              currentData.filter(item => item.id !== (payload.old as { id: any }).id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  // Depend on a stringified version of initialData to handle server-side changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, table, filter, JSON.stringify(initialData)]);

  return data;
}
