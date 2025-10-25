"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Camera, CheckCircle, XCircle, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function ScanQRPage() {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)
  const [hasCamera, setHasCamera] = useState(true)

  useEffect(() => {
    // Check if camera is available
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      setHasCamera(true)
    } else {
      setHasCamera(false)
    }
  }, [])

  const startScanning = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setIsScanning(true)
      }
    } catch (error) {
      console.error("[v0] Camera access error:", error)
      setResult({
        success: false,
        message: "No se pudo acceder a la cámara",
      })
    }
  }

  const stopScanning = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach((track) => track.stop())
      setIsScanning(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center px-4">
          <Link href="/check-in">
            <Button variant="ghost" size="sm" onClick={stopScanning}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="shadow-xl">
          <CardHeader className="text-center">
            <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Camera className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Escanear Código QR</CardTitle>
            <CardDescription>Apunta la cámara al código QR de la cita</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!hasCamera ? (
              <div className="rounded-lg bg-yellow-50 p-4 border border-yellow-200 text-center">
                <p className="text-sm text-yellow-900">
                  Tu dispositivo no tiene cámara o no se pudo acceder a ella. Por favor, usa el método de ingreso
                  manual.
                </p>
                <Link href="/check-in">
                  <Button className="mt-4 bg-transparent" variant="outline">
                    Ingreso Manual
                  </Button>
                </Link>
              </div>
            ) : (
              <>
                <div className="relative aspect-square bg-black rounded-lg overflow-hidden">
                  <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                  {!isScanning && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <Button onClick={startScanning} size="lg">
                        <Camera className="h-5 w-5 mr-2" />
                        Iniciar Escaneo
                      </Button>
                    </div>
                  )}
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

                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-3">¿Problemas con el escaneo?</p>
                  <Link href="/check-in">
                    <Button variant="outline" onClick={stopScanning}>
                      Ingresar Código Manualmente
                    </Button>
                  </Link>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
