"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@acme/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@acme/ui/card"
import { Input } from "@acme/ui/input"
import { Label } from "@acme/ui/label"
import { QrCode, CheckCircle, XCircle, Scan } from "lucide-react"
import Link from "next/link"
import { checkInAppointment } from "@/lib/actions/appointments"

export default function CheckInPage() {
  const [qrCode, setQrCode] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string; appointment?: any } | null>(null)

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setResult(null)

    try {
      const response = await checkInAppointment(qrCode.trim().toUpperCase())

      if (response.error) {
        setResult({
          success: false,
          message: response.error,
        })
        return
      }

      if (response.appointment) {
        setResult({
          success: true,
          message: `Check-in exitoso para ${response.appointment.service_types?.name} con ${response.appointment.professionals?.name}`,
          appointment: response.appointment,
        })
        setQrCode("")
      }
    } catch (error: any) {
      console.error("[v0] Check-in error:", error)
      setResult({
        success: false,
        message: "Error al procesar el check-in",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Card className="shadow-xl">
          <CardHeader className="text-center">
            <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Scan className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Check-in con QR</CardTitle>
            <CardDescription>Ingresa el código QR de tu cita para realizar el check-in</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCheckIn} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="qrCode">Código QR</Label>
                <div className="relative">
                  <QrCode className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="qrCode"
                    type="text"
                    placeholder="APT-XXXXXXXXXXXX"
                    value={qrCode}
                    onChange={(e) => setQrCode(e.target.value.toUpperCase())}
                    className="pl-10 h-12 font-mono"
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground">Ingresa el código que aparece debajo del QR en tu cita</p>
              </div>

              {result && (
                <div
                  className={`rounded-lg p-4 border-2 ${
                    result.success
                      ? "bg-green-50 border-green-200 text-green-900"
                      : "bg-red-50 border-red-200 text-red-900"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {result.success ? (
                      <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    )}
                    <p className="text-sm font-medium">{result.message}</p>
                  </div>
                </div>
              )}

              <Button type="submit" className="w-full h-12" disabled={isLoading || !qrCode.trim()}>
                {isLoading ? "Procesando..." : "Realizar Check-in"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground mb-2">¿Tienes una cita programada?</p>
              <Link href="/dashboard" className="text-sm font-medium text-primary hover:underline">
                Ver mis citas
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
