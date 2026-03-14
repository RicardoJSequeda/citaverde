"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { useRouter } from 'next/navigation'
import { StepService } from "./StepService"
import { StepProfessional } from "./StepProfessional"
import { StepDateTime } from "./StepDateTime"
import { StepConfirmation } from "./StepConfirmation"
import { createClient } from "@/lib/supabase/client"
import { getAvailableSlots } from "@/lib/actions/appointments"
import { Card, CardContent, CardHeader, CardTitle } from "@acme/ui/card"
import { toast } from "@acme/ui/use-toast"

const STEPS = { SERVICE: 1, PROFESSIONAL: 2, DATE_TIME: 3, CONFIRMATION: 4 } as const

export interface BookingData {
  serviceId: string | null;
  professionalId: string | null;
  date: Date | null;
  time: string | null;
  notes: string;
}

export function BookingWizard() {
  const supabase = createClient();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<number>(STEPS.SERVICE);
  const [bookingData, setBookingData] = useState<BookingData>({
    serviceId: null,
    professionalId: null,
    date: null,
    time: null,
    notes: "",
  });

  const [serviceTypes, setServiceTypes] = useState<any[]>([]);
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const nextStep = () => setCurrentStep(prev => prev < 4 ? prev + 1 : prev);
  const prevStep = () => setCurrentStep(prev => prev > 1 ? prev - 1 : prev);
  
  const updateBookingData = useCallback((data: Partial<BookingData>) => {
    setBookingData(prev => ({ ...prev, ...data }));
  }, []);

  const handleBookingSubmit = async () => {
    setIsSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !bookingData.serviceId || !bookingData.professionalId || !bookingData.date || !bookingData.time) {
      toast({ title: "Error", description: "Faltan datos para completar la reserva.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }

    const [hours, minutes] = bookingData.time.split(':').map(Number);
    const appointmentDateTime = new Date(bookingData.date);
    appointmentDateTime.setHours(hours, minutes, 0, 0);

    const { data: newAppointment, error } = await supabase.from('appointments').insert({
      user_id: user.id,
      service_type_id: bookingData.serviceId,
      professional_id: bookingData.professionalId,
      appointment_time: appointmentDateTime.toISOString(),
      status: 'confirmed',
      notes: bookingData.notes,
    }).select('id').single();

    if (error || !newAppointment) {
      setIsSubmitting(false);
      toast({ title: "Error al crear la cita", description: error.message, variant: "destructive" });
    } else {
      // Send confirmation email asynchronously
      console.log("Triggering confirmation email for appointment:", newAppointment.id);
      fetch('/api/emails/send-confirmation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ appointmentId: newAppointment.id }),
      }).then(response => response.json()).then(data => {
          console.log("Email API response:", data.message);
      }).catch(err => {
          console.error("Failed to send confirmation email:", err);
          // Optionally, show a non-blocking toast to the user or log this error
      });

      setIsSubmitting(false);
      toast({ title: "¡Cita confirmada!", description: "Tu cita ha sido agendada. Recibirás un email de confirmación." });
      router.push('/dashboard/appointments');
    }
  };

  useEffect(() => {
    async function loadServiceTypes() {
      const { data } = await supabase.from("service_types").select("*").eq("is_active", true).order("name");
      if (data) setServiceTypes(data);
    }
    loadServiceTypes();
  }, [supabase]);

  useEffect(() => {
    if (!bookingData.serviceId) return;
    async function loadProfessionals() {
      const { data } = await supabase.from("professionals").select("*").eq("is_active", true).order("name");
      if (data) setProfessionals(data);
    }
    loadProfessionals();
  }, [bookingData.serviceId, supabase]);

  useEffect(() => {
    if (!bookingData.professionalId || !bookingData.date || !bookingData.serviceId) return;
    async function loadAvailableSlots() {
      setIsLoadingSlots(true);
      const dateStr = bookingData.date!.toISOString().split("T")[0];
      const result = await getAvailableSlots(bookingData.professionalId!, dateStr, bookingData.serviceId!);
      setAvailableSlots(result.slots || []);
      setIsLoadingSlots(false);
    }
    loadAvailableSlots();
  }, [bookingData.professionalId, bookingData.date, bookingData.serviceId]);

  const renderStep = () => {
    // ... same as before ...
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl md:text-2xl">Reservar Nueva Cita</CardTitle>
      </CardHeader>
      <CardContent>
        {currentStep === STEPS.SERVICE && <StepService serviceTypes={serviceTypes} onSelectService={(serviceId) => { updateBookingData({ serviceId, professionalId: null, date: null, time: null }); nextStep(); }} selectedServiceId={bookingData.serviceId} />}
        {currentStep === STEPS.PROFESSIONAL && <StepProfessional professionals={professionals} onSelectProfessional={(professionalId) => { updateBookingData({ professionalId, date: null, time: null }); nextStep(); }} onBack={prevStep} selectedProfessionalId={bookingData.professionalId} />}
        {currentStep === STEPS.DATE_TIME && <StepDateTime onBack={prevStep} onNext={nextStep} onDateChange={(date) => updateBookingData({ date, time: null })} onTimeSelect={(time) => updateBookingData({ time })} selectedDate={bookingData.date} selectedTime={bookingData.time} availableSlots={availableSlots} isLoading={isLoadingSlots} />}
        {currentStep === STEPS.CONFIRMATION && <StepConfirmation bookingData={bookingData} service={serviceTypes.find(s => s.id === bookingData.serviceId)} professional={professionals.find(p => p.id === bookingData.professionalId)} onBack={prevStep} onSubmit={handleBookingSubmit} isSubmitting={isSubmitting} onNotesChange={(notes) => updateBookingData({ notes })} />}
      </CardContent>
    </Card>
  )
}
