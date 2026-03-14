import React from 'react';
import { Button } from "@acme/ui/button";
import { Textarea } from "@acme/ui/textarea";
import { ArrowLeft, Calendar, Clock, Briefcase, User } from 'lucide-react';
import { BookingData } from './BookingWizard';
import { Loader2 } from 'lucide-react';

interface StepConfirmationProps {
  bookingData: BookingData;
  service: any;
  professional: any;
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  onNotesChange: (notes: string) => void;
}

export function StepConfirmation({ bookingData, service, professional, onBack, onSubmit, isSubmitting, onNotesChange }: StepConfirmationProps) {

  const { date, time, notes } = bookingData;

  return (
    <div>
        <Button variant="ghost" onClick={onBack} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
        </Button>
        <h3 className="font-semibold text-lg mb-4">4. Confirma tu cita</h3>
        
        <div className="border rounded-lg p-6 space-y-4">
            <h4 className="font-medium text-xl mb-4">Resumen de la Cita</h4>
            <div className="flex items-center"><Briefcase className="h-5 w-5 mr-3 text-gray-500" /> <div><strong>Servicio:</strong> {service?.name}</div></div>
            <div className="flex items-center"><User className="h-5 w-5 mr-3 text-gray-500" /> <div><strong>Profesional:</strong> {professional?.name}</div></div>
            <div className="flex items-center"><Calendar className="h-5 w-5 mr-3 text-gray-500" /> <div><strong>Fecha:</strong> {date ? date.toLocaleDateString() : ''}</div></div>
            <div className="flex items-center"><Clock className="h-5 w-5 mr-3 text-gray-500" /> <div><strong>Hora:</strong> {time}</div></div>
            
            <div className="pt-4">
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">Notas adicionales (opcional)</label>
              <Textarea 
                id="notes"
                placeholder="Añade cualquier información relevante para el profesional..."
                value={notes}
                onChange={(e) => onNotesChange(e.target.value)}
              />
            </div>
        </div>

        <div className="mt-8 flex justify-end">
            <Button onClick={onSubmit} disabled={isSubmitting}>
                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Confirmando...</> : 'Confirmar Cita'}
            </Button>
        </div>
    </div>
  );
}
