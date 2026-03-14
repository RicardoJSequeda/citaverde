
import { Suspense } from 'react';
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Button } from "@acme/ui/button"
import { ReportFilters } from '@/components/report-filters';
import { getAdvancedReportData, getReportFilterOptions } from '@/lib/reports';
import { ReportKPIs } from '@/components/report-kpis';
import { ReportCharts } from '@/components/report-charts';

export default async function ReportsPage({ searchParams }: { searchParams: { from?: string; to?: string; professionalId?: string; serviceId?: string; } }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (profile?.role !== "admin") redirect("/dashboard")

  const filters = {
    from: searchParams.from,
    to: searchParams.to,
    professionalId: searchParams.professionalId,
    serviceId: searchParams.serviceId
  };

  const reportData = await getAdvancedReportData(filters);
  const filterOptions = await getReportFilterOptions();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto flex h-16 items-center px-4">
          <Link href="/admin">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver al Panel de Admin
            </Button>
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Reportes Avanzados</h1>
          <p className="text-muted-foreground">Filtra y analiza el rendimiento de la clínica.</p>
        </div>
        
        <Suspense fallback={<div>Cargando filtros...</div>}>
          <ReportFilters options={filterOptions} rawData={reportData.rawData} />
        </Suspense>

        <Suspense fallback={<div>Calculando métricas...</div>}>
          <ReportKPIs data={reportData.kpis} />
        </Suspense>
        
        <Suspense fallback={<div>Generando gráficos...</div>}>
          <ReportCharts data={reportData.charts} />
        </Suspense>
      </div>
    </div>
  )
}
