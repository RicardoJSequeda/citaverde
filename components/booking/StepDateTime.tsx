import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { ArrowLeft, Edit2 } from 'lucide-react';
import { Loader2 } from "lucide-react";

interface StepDateTimeProps {
  onBack: () => void;
  onNext: () => void;
  onDateChange: (date: Date | undefined) => void;
  onTimeSelect: (time: string) => void;
  selectedDate: Date | null;
  selectedTime: string | null;
  availableSlots: string[];
  isLoading: boolean;
}

export function StepDateTime({
  onBack, onNext, onDateChange, onTimeSelect, 
  selectedDate, selectedTime, availableSlots, isLoading 
}: StepDateTimeProps) {

  const [mobileView, setMobileView] = useState<'calendar' | 'time'>('calendar');

  useEffect(() => {
    // If a date is already selected when the component loads, show the time view on mobile.
    if (selectedDate) {
      setMobileView('time');
    }
  }, []); // Run only once on mount

  const handleDateSelect = (date: Date | undefined) => {
    onDateChange(date);
    if (date) {
      setMobileView('time'); // Switch to time view on mobile
    }
  };

  const renderCalendarView = () => (
    <div className={mobileView === 'time' ? 'hidden md:block' : ''}>
      <h4 className="font-medium mb-2 text-center">Selecciona una fecha</h4>
      <Calendar
        mode="single"
        selected={selectedDate || undefined}
        onSelect={handleDateSelect}
        className="rounded-md border justify-center inline-block"
        disabled={(date) => date < new Date(new Date().setDate(new Date().getDate() - 1))}
      />
    </div>
  );

  const renderTimeView = () => (
    <div className={mobileView === 'calendar' ? 'hidden md:block' : ''}>
        <div className="flex justify-between items-center mb-2">
            <h4 className="font-medium">Selecciona una hora</h4>
            <Button variant="outline" size="sm" className="md:hidden" onClick={() => setMobileView('calendar')}>
                <Edit2 className="h-3 w-3 mr-2"/>
                Cambiar fecha
            </Button>
        </div>
      
      {isLoading && <div className="flex items-center min-h-[100px]"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Cargando...</div>}
      
      {!isLoading && selectedDate && availableSlots.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {availableSlots.map(time => (
            <Button 
              key={time} 
              variant={selectedTime === time ? "default" : "outline"}
              onClick={() => onTimeSelect(time)}
            >
              {time}
            </Button>
          ))}
        </div>
      )}

      {!isLoading && selectedDate && availableSlots.length === 0 && (
        <p className="text-sm text-gray-500 pt-4 min-h-[100px]">No hay horas disponibles. Por favor, cambia la fecha.</p>
      )}

      {!isLoading && !selectedDate && (
        <p className="text-sm text-gray-500 pt-4 min-h-[100px]">Selecciona una fecha para ver los horarios.</p>
      )}
    </div>
  );

  return (
    <div>
      <Button variant="ghost" onClick={onBack} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Volver
      </Button>
      <h3 className="font-semibold text-lg mb-4">3. Selecciona fecha y hora</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 md:gap-8">
        {renderCalendarView()}
        {renderTimeView()}
      </div>

      <div className="mt-8 flex justify-end">
        <Button onClick={onNext} disabled={!selectedTime || !selectedDate}>
          Siguiente
        </Button>
      </div>
    </div>
  );
}
