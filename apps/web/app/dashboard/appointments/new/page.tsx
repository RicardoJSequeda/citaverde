"use client"

import { BookingWizard } from "@/components/booking/BookingWizard";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@acme/ui/button";

export default function NewAppointmentPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="border-b bg-white/80 backdrop-blur-sm">
          <div className="container mx-auto flex h-16 items-center px-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Button>
            </Link>
          </div>
        </header>

      <div className="container mx-auto px-4 py-6 md:py-8 max-w-2xl">
          <BookingWizard />
      </div>
    </div>
  );
}

