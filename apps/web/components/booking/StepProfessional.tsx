import React from 'react';
import { Button } from "@acme/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@acme/ui/card";
import { ArrowLeft } from 'lucide-react';

interface StepProfessionalProps {
  professionals: any[];
  onSelectProfessional: (professionalId: string) => void;
  onNext: () => void;
  onBack: () => void;
  selectedProfessionalId: string | null;
}

export function StepProfessional({ professionals, onSelectProfessional, onNext, onBack, selectedProfessionalId }: StepProfessionalProps) {

  const handleProfessionalSelection = (professionalId: string) => {
    onSelectProfessional(professionalId);
    onNext();
  }

  return (
    <div>
      <Button variant="ghost" onClick={onBack} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Volver
      </Button>
      <h3 className="font-semibold text-lg mb-4">2. Selecciona un profesional</h3>
      {professionals.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {professionals.map((prof) => (
            <Card 
              key={prof.id} 
              className={`cursor-pointer transition-all ${selectedProfessionalId === prof.id ? 'border-blue-500 shadow-md' : 'hover:shadow-md'}`}
              onClick={() => handleProfessionalSelection(prof.id)}
            >
              <CardHeader>
                  <CardTitle>{prof.name}</CardTitle>
                  <CardDescription>{prof.specialty}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : (
        <p>No hay profesionales disponibles para este servicio.</p>
      )}
    </div>
  );
}
