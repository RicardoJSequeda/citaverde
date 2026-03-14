'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Button } from '@acme/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@acme/ui/select';
import { DateRangePicker } from '@acme/ui/date-range-picker';
import { download as Papa } from 'papaparse';
import { Download } from 'lucide-react';

export function ReportFilters({ options, rawData }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleFilterChange = (key, value) => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    if (value) {
      current.set(key, value);
    } else {
      current.delete(key);
    }
    const search = current.toString();
    const query = search ? `?${search}` : "";
    router.push(`${pathname}${query}`);
  };

  const handleDateChange = (range) => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    if (range?.from) {
      current.set('from', range.from.toISOString());
    } else {
      current.delete('from');
    }
    if (range?.to) {
      current.set('to', range.to.toISOString());
    } else {
      current.delete('to');
    }
    const search = current.toString();
    const query = search ? `?${search}` : "";
    router.push(`${pathname}${query}`);
  }

  const exportToCsv = () => {
    const csv = Papa.unparse(rawData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'reporte_citas.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm mb-8 flex flex-wrap items-center gap-4">
      <DateRangePicker
        onUpdate={({ range }) => handleDateChange(range)}
        initialDateFrom={searchParams.get('from')}
        initialDateTo={searchParams.get('to')}
        align="start"
        locale="es-ES"
        showCompare={false}
      />

      <Select onValueChange={(value) => handleFilterChange('professionalId', value)} defaultValue={searchParams.get('professionalId') ?? ''}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Todos los Profesionales" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">Todos los Profesionales</SelectItem>
          {options.professionals.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select onValueChange={(value) => handleFilterChange('serviceId', value)} defaultValue={searchParams.get('serviceId') ?? ''}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Todos los Servicios" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">Todos los Servicios</SelectItem>
          {options.services.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
        </SelectContent>
      </Select>

      <Button onClick={exportToCsv} variant="outline" className="ml-auto">
        <Download className="h-4 w-4 mr-2" />
        Exportar a CSV
      </Button>
    </div>
  );
}
