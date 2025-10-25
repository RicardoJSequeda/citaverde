import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AlertCircle, CheckCircle, XCircle } from "lucide-react"
import { closeQueue, reopenQueue } from "@/lib/actions/admin"
import { revalidatePath } from "next/cache"

export default async function QueuesPage() {
  const supabase = await createClient()

  const { data: serviceTypes } = await supabase.from("service_types").select("*, queue_tickets(count)").order("name")

  async function handleCloseQueue(formData: FormData) {
    "use server"
    const serviceTypeId = formData.get("serviceTypeId") as string
    const reason = formData.get("reason") as string
    await closeQueue(serviceTypeId, reason)
    revalidatePath("/admin/queues")
  }

  async function handleReopenQueue(formData: FormData) {
    "use server"
    const serviceTypeId = formData.get("serviceTypeId") as string
    await reopenQueue(serviceTypeId)
    revalidatePath("/admin/queues")
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Queue Management</h1>
        <p className="text-muted-foreground">Manage and monitor service queues</p>
      </div>

      <div className="grid gap-4">
        {serviceTypes?.map((service) => {
          const waitingCount = service.queue_tickets?.filter((t: any) => t.status === "waiting").length || 0

          return (
            <Card key={service.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: service.color }} />
                    <div>
                      <CardTitle>{service.name}</CardTitle>
                      <CardDescription>{service.description}</CardDescription>
                    </div>
                  </div>
                  <Badge variant={service.is_active ? "default" : "destructive"}>
                    {service.is_active ? (
                      <>
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Active
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3 h-3 mr-1" />
                        Closed
                      </>
                    )}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Waiting: {waitingCount} tickets</p>
                    {!service.is_active && service.closure_reason && (
                      <div className="flex items-center gap-2 text-sm text-destructive">
                        <AlertCircle className="w-4 h-4" />
                        <span>{service.closure_reason}</span>
                      </div>
                    )}
                  </div>

                  {service.is_active ? (
                    <form action={handleCloseQueue}>
                      <input type="hidden" name="serviceTypeId" value={service.id} />
                      <input type="hidden" name="reason" value="Temporary closure for maintenance" />
                      <Button type="submit" variant="destructive" size="sm">
                        Close Queue
                      </Button>
                    </form>
                  ) : (
                    <form action={handleReopenQueue}>
                      <input type="hidden" name="serviceTypeId" value={service.id} />
                      <Button type="submit" variant="default" size="sm">
                        Reopen Queue
                      </Button>
                    </form>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
