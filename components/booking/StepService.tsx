import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface StepServiceProps {
  serviceTypes: any[];
  onSelectService: (serviceId: string) => void;
  onNext: () => void;
  selectedServiceId: string | null;
}

export function StepService({ serviceTypes, onSelectService, onNext, selectedServiceId }: StepServiceProps) {

  const handleServiceSelection = (serviceId: string) => {
    onSelectService(serviceId);
    onNext();
  }

  return (
    <div>
        <h3 className="font-semibold text-lg mb-4">1. Selecciona el tipo de servicio</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {serviceTypes.map((service) => (
                <Card 
                    key={service.id} 
                    className={`cursor-pointer transition-all ${selectedServiceId === service.id ? 'border-blue-500 shadow-md' : 'hover:shadow-md'}`}
                    onClick={() => handleServiceSelection(service.id)}
                >
                    <CardHeader>
                        <CardTitle>{service.name}</CardTitle>
                        <CardDescription>{service.duration_minutes} minutos</CardDescription>
                    </CardHeader>
                </Card>
            ))}
        </div>
    </div>
  );
}
