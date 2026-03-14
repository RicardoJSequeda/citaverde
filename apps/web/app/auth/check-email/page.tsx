import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@acme/ui/card"
import { Mail } from "lucide-react"
import Link from "next/link"

export default function CheckEmailPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="w-full max-w-md">
        <Card className="shadow-xl">
          <CardHeader className="space-y-4 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Mail className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">Verifica tu correo</CardTitle>
            <CardDescription>
              Te hemos enviado un enlace de confirmación a tu correo electrónico. Por favor revisa tu bandeja de entrada
              y haz clic en el enlace para activar tu cuenta.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground mb-4">Si no ves el correo, revisa tu carpeta de spam.</p>
            <Link href="/auth/login" className="text-sm font-medium text-primary hover:underline">
              Volver al inicio de sesión
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
