import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@acme/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@acme/ui/tabs"
import { getProfessionalPerformance, getBottleneckAnalysis, getDigitalAdoptionMetrics } from "@/lib/actions/admin"
import { BarChart3, TrendingUp, Leaf, Users } from "lucide-react"

export default async function AnalyticsPage() {
  const endDate = new Date().toISOString().split("T")[0]
  const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]

  const performanceResult = await getProfessionalPerformance(startDate, endDate)
  const bottleneckResult = await getBottleneckAnalysis(startDate, endDate)
  const adoptionResult = await getDigitalAdoptionMetrics(startDate, endDate)

  const performance = performanceResult.performance || []
  const adoption = adoptionResult.metrics

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Advanced Analytics</h1>
        <p className="text-muted-foreground">Insights and performance metrics</p>
      </div>

      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="performance">
            <Users className="w-4 h-4 mr-2" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="bottlenecks">
            <BarChart3 className="w-4 h-4 mr-2" />
            Bottlenecks
          </TabsTrigger>
          <TabsTrigger value="adoption">
            <TrendingUp className="w-4 h-4 mr-2" />
            Digital Adoption
          </TabsTrigger>
          <TabsTrigger value="environmental">
            <Leaf className="w-4 h-4 mr-2" />
            Environmental Impact
          </TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Professional Performance Comparison</CardTitle>
              <CardDescription>Last 30 days</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {performance.map((prof: any) => (
                  <div key={prof.professionalId} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-semibold">{prof.name}</h3>
                        <p className="text-sm text-muted-foreground">{prof.specialty}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">{prof.averageRating.toFixed(1)}</p>
                        <p className="text-xs text-muted-foreground">Avg Rating</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Total</p>
                        <p className="font-semibold">{prof.totalAppointments}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Completion</p>
                        <p className="font-semibold">{prof.completionRate.toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">No-Show</p>
                        <p className="font-semibold">{prof.noShowRate.toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Avg Wait</p>
                        <p className="font-semibold">{prof.averageWaitMinutes.toFixed(0)} min</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bottlenecks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Queue Bottleneck Analysis</CardTitle>
              <CardDescription>Peak hours and service demand</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Detailed bottleneck analysis by hour and service type</p>
              {/* Add visualization here */}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="adoption" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Appointments</CardTitle>
                <CardDescription>Digital vs Manual booking</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Digital</span>
                    <span className="font-semibold">{adoption?.appointments.digital}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Manual</span>
                    <span className="font-semibold">{adoption?.appointments.manual}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t">
                    <span className="text-sm font-semibold">Digital Rate</span>
                    <span className="font-bold text-primary">{adoption?.appointments.digitalRate.toFixed(1)}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Queue Tickets</CardTitle>
                <CardDescription>Digital vs Walk-in</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Digital</span>
                    <span className="font-semibold">{adoption?.tickets.digital}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Walk-in</span>
                    <span className="font-semibold">{adoption?.tickets.manual}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t">
                    <span className="text-sm font-semibold">Digital Rate</span>
                    <span className="font-bold text-primary">{adoption?.tickets.digitalRate.toFixed(1)}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="environmental" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Paper Saved</CardTitle>
                <CardDescription>Sheets not printed</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{adoption?.environmental.paperSheetsSaved.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground mt-1">sheets</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>CO₂ Reduction</CardTitle>
                <CardDescription>Carbon footprint saved</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{adoption?.environmental.co2SavedKg}</p>
                <p className="text-sm text-muted-foreground mt-1">kg CO₂</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Trees Equivalent</CardTitle>
                <CardDescription>Environmental impact</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{adoption?.environmental.treesEquivalent}</p>
                <p className="text-sm text-muted-foreground mt-1">trees saved</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
