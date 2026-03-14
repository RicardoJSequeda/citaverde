
import { createServerClient } from '@/lib/supabase/server';
import { cache } from 'react';

// Main function to get all report data
export const getAdvancedReportData = cache(async (filters: { from?: string; to?: string; professionalId?: string; serviceId?: string; }) => {
  const supabase = createServerClient();
  
  // Base query
  let query = supabase
    .from('appointments')
    .select(`
      id,
      appointment_date,
      professional_id,
      service_type_id,
      queue_tickets (
        id,
        status,
        issued_at,
        called_at,
        completed_at
      ),
      professional:professionals(name),
      service_type:service_types(name)
    `);

  // Default to the last 30 days if no dates are provided
  const fromDate = filters.from || new Date(new Date().setDate(new Date().getDate() - 30)).toISOString();
  const toDate = filters.to || new Date().toISOString();

  query = query.gte('appointment_date', fromDate);
  query = query.lte('appointment_date', toDate);

  if (filters.professionalId) {
    query = query.eq('professional_id', filters.professionalId);
  }
  if (filters.serviceId) {
    query = query.eq('service_type_id', filters.serviceId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching report data:', error);
    return { kpis: {}, charts: {}, rawData: [] };
  }

  // ===================================
  // Process data for KPIs and Charts
  // ===================================

  const totalAppointments = data.length;
  let noShowCount = 0;
  let totalWaitTime = 0;
  let totalServiceTime = 0;
  let waitingTicketsCount = 0;
  let serviceTicketsCount = 0;

  const professionalPerformance: { [key: string]: number } = {};
  const serviceDemand: { [key: string]: number } = {};

  const rawDataForExport = data.map(apt => {
    const ticket = apt.queue_tickets[0];
    let waitTime = null;
    let serviceTime = null;

    if (ticket) {
      if (ticket.status === 'no-show') {
        noShowCount++;
      }
      if (ticket.called_at && ticket.issued_at) {
        waitTime = (new Date(ticket.called_at).getTime() - new Date(ticket.issued_at).getTime()) / (1000 * 60);
        totalWaitTime += waitTime;
        waitingTicketsCount++;
      }
      if (ticket.completed_at && ticket.called_at) {
        serviceTime = (new Date(ticket.completed_at).getTime() - new Date(ticket.called_at).getTime()) / (1000 * 60);
        totalServiceTime += serviceTime;
        serviceTicketsCount++;
      }
    }
    
    const professionalName = apt.professional?.name || 'N/A';
    const serviceName = apt.service_type?.name || 'N/A';

    professionalPerformance[professionalName] = (professionalPerformance[professionalName] || 0) + 1;
    serviceDemand[serviceName] = (serviceDemand[serviceName] || 0) + 1;

    return {
      appointmentId: apt.id,
      date: apt.appointment_date,
      professional: professionalName,
      service: serviceName,
      status: ticket?.status ?? 'scheduled',
      waitTime: waitTime ? waitTime.toFixed(2) : null,
      serviceTime: serviceTime ? serviceTime.toFixed(2) : null,
    };
  });

  const noShowRate = totalAppointments > 0 ? (noShowCount / totalAppointments) * 100 : 0;
  const avgWaitTime = waitingTicketsCount > 0 ? totalWaitTime / waitingTicketsCount : 0;
  const avgServiceTime = serviceTicketsCount > 0 ? totalServiceTime / serviceTicketsCount : 0;

  // Format for charts
  const professionalChartData = Object.entries(professionalPerformance).map(([name, count]) => ({ name, count }));
  const serviceChartData = Object.entries(serviceDemand).map(([name, count]) => ({ name, count }));

  return {
    kpis: {
      totalAppointments,
      noShowRate,
      avgWaitTime,
      avgServiceTime
    },
    charts: {
      professionalPerformance: professionalChartData,
      serviceDemand: serviceChartData
    },
    rawData: rawDataForExport
  };
});

// Function to get filter options (professionals, services)
export const getReportFilterOptions = cache(async () => {
    const supabase = createServerClient();
    const [professionals, services] = await Promise.all([
        supabase.from('professionals').select('id, name'),
        supabase.from('service_types').select('id, name')
    ]);

    return {
        professionals: professionals.data ?? [],
        services: services.data ?? []
    };
});
