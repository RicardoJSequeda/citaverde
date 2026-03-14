import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@acme/ui/button";
import { AppointmentCard } from "@/components/appointments/AppointmentCard";

// Define the expected shape of the appointment data
// This helps with type safety and providing a single source of truth for the data structure.
type AppointmentWithDetails = {
  id: string;
  appointment_time: string;
  status: string;
  notes: string | null;
  service_types: {
    name: string;
    duration: number;
  } | null;
  professionals: {
    name: string;
    specialty: string;
  } | null;
};

export default async function AppointmentsPage() {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login");
  }

  // Explicitly type the expected data from the query
  const { data: appointments, error } = await supabase
    .from('appointments')
    .select(`
      id,
      appointment_time,
      status,
      notes,
      service_types (name, duration),
      professionals (name, specialty)
    `)
    .eq('user_id', user.id)
    .order('appointment_time', { ascending: true })
    .returns<AppointmentWithDetails[]>(); // Ensure the returned data is typed

  if (error) {
    console.error("Error fetching appointments:", error);
    // In a real app, you might use a toast or a dedicated error component
    return <p className="p-8 text-center text-red-500">Error al cargar las citas.</p>;
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <header className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
        <h1 className="text-2xl md:text-3xl font-bold">Mis Citas</h1>
        <Button asChild>
          <Link href="/booking/new">Agendar Nueva Cita</Link>
        </Button>
      </header>
      
      {appointments && appointments.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed rounded-lg mt-8">
          <h2 className="text-xl font-semibold">Aún no tienes citas programadas.</h2>
          <p className="text-gray-500 mt-2 mb-6">¡Reserva tu primera cita ahora mismo!</p>
          <Button asChild>
            <Link href="/booking/new">Reservar Cita</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {appointments && appointments.map(app => (
            <AppointmentCard key={app.id} appointment={app} />
          ))}
        </div>
      )}
    </div>
  );
}