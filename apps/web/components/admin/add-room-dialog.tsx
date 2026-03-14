"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@acme/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@acme/ui/dialog"
import { Input } from "@acme/ui/input"
import { Label } from "@acme/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@acme/ui/select"
import { Plus } from "lucide-react"
import { createRoom } from "@/lib/actions/admin"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

export function AddRoomDialog() {
  const router = useRouter()
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [departments, setDepartments] = useState<any[]>([])

  const [formData, setFormData] = useState({
    name: "",
    capacity: 1,
    departmentId: "",
  })

  useEffect(() => {
    async function loadDepartments() {
      const { data } = await supabase.from("departments").select("*").eq("is_active", true).order("name")
      if (data) setDepartments(data)
    }
    loadDepartments()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const result = await createRoom({
        name: formData.name,
        capacity: formData.capacity,
        departmentId: formData.departmentId || undefined,
      })

      if (result.error) {
        alert(result.error)
        return
      }

      setOpen(false)
      setFormData({ name: "", capacity: 1, departmentId: "" })
      router.refresh()
    } catch (error) {
      console.error("[v0] Error creating room:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Agregar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agregar Sala</DialogTitle>
          <DialogDescription>Registra una nueva sala o consultorio</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre de la Sala</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Consultorio 1"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="capacity">Capacidad</Label>
              <Input
                id="capacity"
                type="number"
                min="1"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: Number.parseInt(e.target.value) })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Departamento (opcional)</Label>
              <Select
                value={formData.departmentId}
                onValueChange={(value) => setFormData({ ...formData, departmentId: value })}
              >
                <SelectTrigger id="department">
                  <SelectValue placeholder="Seleccionar departamento" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
