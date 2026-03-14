/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useMemo, FC } from 'react';
import { DateRange } from 'react-day-picker';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Button } from '@acme/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@acme/ui/select';
import { DatePickerWithRange } from '@acme/ui/date-range-picker';
import { Card, CardContent, CardHeader, CardTitle } from '@acme/ui/card';

interface ReportData {
  appointmentId: string;
  date: string;
  patient: string;
  professional: string;
  service: string;
  status: string;
  waitTime: string | null;
  serviceTime: string | null;
}

interface FilterOptions {
  professionals: { id: string; full_name: string; }[];
  services: { id: string; name: string; }[];
}

interface Props {
  initialData: ReportData[];
  filterOptions: FilterOptions;
  onFilterChange: (filters: { from?: string; to?: string; professionalId?: string; serviceId?: string; }) => Promise<ReportData[]>;
}

const downloadCSV = (data: any[], filename = 'reporte.csv') => {
  if (!data.length) return;

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(header => JSON.stringify(row[header], (key, value) => value === null ? '' : value)).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const AdvancedReportsDashboard: FC<Props> = ({ initialData, filterOptions, onFilterChange }) => {
  const [data, setData] = useState<ReportData[]>(initialData);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [professionalId, setProfessionalId] = useState<string>('');
  const [serviceId, setServiceId] = useState<string>('');

  const handleFilter = async () => {
    const filteredData = await onFilterChange({
      from: dateRange?.from?.toISOString().split('T')[0],
      to: dateRange?.to?.toISOString().split('T')[0],
      professionalId: professionalId === 'all' ? undefined : professionalId,
      serviceId: serviceId === 'all' ? undefined : serviceId,
    });
    setData(filteredData);
  };

  const { 
    totalAppointments, 
    avgWaitTime, 
    avgServiceTime, 
    appointmentsByProfessional, 
    appointmentsByService,
    appointmentsOverTime,
    noShowRate 
  } = useMemo(() => {
    if (!data.length) return { totalAppointments: 0, avgWaitTime: 0, avgServiceTime: 0, appointmentsByProfessional: [], appointmentsByService: [], appointmentsOverTime: [], noShowRate: 0 };

    let totalWait = 0, waitCount = 0;
    let totalService = 0, serviceCount = 0;
    let noShows = 0;

    const byProfessional = data.reduce((acc, curr) => {
      acc[curr.professional] = (acc[curr.professional] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byService = data.reduce((acc, curr) => {
      acc[curr.service] = (acc[curr.service] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byDate = data.reduce((acc, curr) => {
        const date = curr.date.split('T')[0];
        acc[date] = (acc[date] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    data.forEach(d => {
      if (d.waitTime) { totalWait += parseFloat(d.waitTime); waitCount++; }
      if (d.serviceTime) { totalService += parseFloat(d.serviceTime); serviceCount++; }
      if (d.status === 'no-show') noShows++;
    });

    return {
      totalAppointments: data.length,
      avgWaitTime: waitCount > 0 ? totalWait / waitCount : 0,
      avgServiceTime: serviceCount > 0 ? totalService / serviceCount : 0,
      appointmentsByProfessional: Object.entries(byProfessional).map(([name, count]) => ({ name, citas: count })),
      appointmentsByService: Object.entries(byService).map(([name, count]) => ({ name, citas: count })),
      appointmentsOverTime: Object.entries(byDate).map(([date, count]) => ({ date, citas: count })).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
      noShowRate: data.length > 0 ? (noShows / data.length) * 100 : 0,
    };
  }, [data]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Filtros de Reporte</CardTitle>
          <Button onClick={() => downloadCSV(data)}>Exportar a CSV</Button>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row gap-4">
            <DatePickerWithRange onDateChange={setDateRange} />
            <Select value={professionalId} onValueChange={setProfessionalId}>
                <SelectTrigger><SelectValue placeholder="Seleccionar Profesional" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Todos los Profesionales</SelectItem>
                    {filterOptions.professionals.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
                </SelectContent>
            </Select>
            <Select value={serviceId} onValueChange={setServiceId}>
                <SelectTrigger><SelectValue placeholder="Seleccionar Servicio" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Todos los Servicios</SelectItem>
                    {filterOptions.services.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
            </Select>
            <Button onClick={handleFilter}>Aplicar Filtros</Button>
        </CardContent>
      </Card>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
              <CardHeader><CardTitle>Total de Citas</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">{totalAppointments}</p></CardContent>
          </Card>
          <Card>
              <CardHeader><CardTitle>Espera Promedio (min)</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">{avgWaitTime.toFixed(2)}</p></CardContent>
          </Card>
          <Card>
              <CardHeader><CardTitle>Atención Promedio (min)</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">{avgServiceTime.toFixed(2)}</p></CardContent>
          </Card>
           <Card>
              <CardHeader><CardTitle>Tasa de Inasistencia</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">{noShowRate.toFixed(2)}%</p></CardContent>
          </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Citas a lo Largo del Tiempo</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={appointmentsOverTime}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="citas" stroke="#8884d8" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Citas por Profesional</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={appointmentsByProfessional}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="citas" fill="#82ca9d" />
                </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

       <Card>
          <CardHeader><CardTitle>Detalle de Citas</CardTitle></CardHeader>
          <CardContent>
              <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                          <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paciente</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Profesional</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Servicio</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Espera (min)</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Atención (min)</th>
                          </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                          {data.map(item => (
                              <tr key={item.appointmentId}>
                                  <td className="px-6 py-4 whitespace-nowrap">{new Date(item.date).toLocaleDateString()}</td>
                                  <td className="px-6 py-4 whitespace-nowrap">{item.patient}</td>
                                  <td className="px-6 py-4 whitespace-nowrap">{item.professional}</td>
                                  <td className="px-6 py-4 whitespace-nowrap">{item.service}</td>
                                  <td className="px-6 py-4 whitespace-nowrap">{item.status}</td>
                                  <td className="px-6 py-4 whitespace-nowrap">{item.waitTime ?? 'N/A'}</td>
                                  <td className="px-6 py-4 whitespace-nowrap">{item.serviceTime ?? 'N/A'}</td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </CardContent>
      </Card>
    </div>
  );
};
