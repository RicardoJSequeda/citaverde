'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@acme/ui/card";
import { Users, Clock, AlertTriangle, TrendingUp } from "lucide-react";

export function ReportKPIs({ data }) {
  const {
    totalAppointments = 0,
    noShowRate = 0,
    avgWaitTime = 0,
    avgServiceTime = 0
  } = data;

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Total de Citas</CardTitle>
          <Users className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{totalAppointments}</div>
          <p className="text-xs text-muted-foreground">En el período seleccionado</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Tasa de No-Show</CardTitle>
          <AlertTriangle className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{noShowRate.toFixed(1)}%</div>
          <p className="text-xs text-muted-foreground">Pacientes que no asistieron</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Tiempo Espera Prom.</CardTitle>
          <Clock className="h-4 w-4 text-yellow-600" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{avgWaitTime.toFixed(1)} min</div>
          <p className="text-xs text-muted-foreground">Desde el ticket hasta el llamado</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Tiempo Atención Prom.</CardTitle>
          <TrendingUp className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{avgServiceTime.toFixed(1)} min</div>
          <p className="text-xs text-muted-foreground">Duración de la consulta</p>
        </CardContent>
      </Card>
    </div>
  );
}
