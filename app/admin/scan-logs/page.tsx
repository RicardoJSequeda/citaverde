import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, Monitor, Smartphone } from "lucide-react"

export default async function ScanLogsPage() {
  const supabase = await createClient()

  const { data: logs } = await supabase
    .from("qr_scan_logs")
    .select("*, profiles(full_name)")
    .order("scanned_at", { ascending: false })
    .limit(100)

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">QR Scan Audit Logs</h1>
        <p className="text-muted-foreground">Security and usage tracking</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Scans</CardTitle>
          <CardDescription>Last 100 QR code scan attempts</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>QR Code</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Device</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs?.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-sm">{new Date(log.scanned_at).toLocaleString()}</TableCell>
                  <TableCell className="font-mono text-xs">{log.qr_code}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{log.scan_type}</Badge>
                  </TableCell>
                  <TableCell>{log.profiles?.full_name || "Anonymous"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {log.user_agent?.includes("Mobile") ? (
                        <Smartphone className="w-4 h-4" />
                      ) : (
                        <Monitor className="w-4 h-4" />
                      )}
                      <span className="text-xs text-muted-foreground">{log.user_agent?.substring(0, 30)}...</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{log.ip_address}</TableCell>
                  <TableCell>
                    {log.success ? (
                      <Badge variant="default" className="gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Success
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="gap-1">
                        <XCircle className="w-3 h-3" />
                        Failed
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
