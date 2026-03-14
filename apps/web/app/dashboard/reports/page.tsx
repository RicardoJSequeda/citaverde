import { getAdvancedReportData, getReportFilterOptions } from '@/lib/reports';
import { AdvancedReportsDashboard } from '@/components/reports/AdvancedReportsDashboard';

export default async function ReportsPage() {

  // Server-side action to be passed to the client component
  async function handleFilterChange(filters: { from?: string; to?: string; professionalId?: string; serviceId?: string; }) {
    'use server';
    return getAdvancedReportData(filters);
  }

  const [initialData, filterOptions] = await Promise.all([
    getAdvancedReportData({}), // Initial load with no filters
    getReportFilterOptions()
  ]);

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Reportes Avanzados</h1>
      <AdvancedReportsDashboard 
        initialData={initialData}
        filterOptions={filterOptions}
        onFilterChange={handleFilterChange}
      />
    </div>
  );
}
