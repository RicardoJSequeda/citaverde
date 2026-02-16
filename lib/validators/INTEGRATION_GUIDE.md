# Zod Validation Integration Guide

## Overview

This guide explains how to integrate the Zod validation schemas and utilities into your existing server actions to ensure type-safe and validated input handling.

---

## Files Created

```
lib/validators/
├── schemas.ts           (23+ Zod validation schemas)
├── validate.ts          (Validation middleware and utilities)
└── INTEGRATION_GUIDE.md (this file)
```

### schemas.ts
- 23 Zod validation schemas
- Type exports for TypeScript
- Helper functions for validation

### validate.ts
- Middleware for wrapping server actions
- Consistent error handling
- Sanitization helpers
- Batch validation utilities

---

## Quick Start

### Step 1: Install Zod (if not already installed)

```bash
npm install zod
# or
pnpm add zod
# or
yarn add zod
```

### Step 2: Update a Server Action

**Before (no validation):**

```typescript
// lib/actions/appointments.ts
export async function createAppointment(formData: unknown) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  // No validation - what if formData has:
  // - Invalid UUID?
  // - Date in the past?
  // - Time format like "99:99"?
  // - Notes with 10000 characters?

  // This could cause bugs or crashes
}
```

**After (with validation):**

```typescript
// lib/actions/appointments.ts
import { CreateAppointmentSchema } from "@/lib/validators/schemas"
import { withValidation } from "@/lib/validators/validate"

export async function createAppointment(formData: unknown) {
  return withValidation(
    CreateAppointmentSchema,
    formData,
    async (validated) => {
      const supabase = await createServerClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        throw new Error("Not authenticated")
      }

      // Now 100% safe:
      // - validated.professionalId is valid UUID ✓
      // - validated.appointmentDate is future date ✓
      // - validated.startTime is valid 24-hour time ✓
      // - validated.notes is <= 500 chars ✓

      const { data: appointment } = await supabase
        .from("appointments")
        .insert({
          patient_id: user.id,
          professional_id: validated.professionalId,
          service_type_id: validated.serviceTypeId,
          appointment_date: validated.appointmentDate,
          start_time: validated.startTime,
          end_time: calculateEndTime(validated.startTime, serviceType.duration),
          notes: validated.notes || null,
          status: "scheduled",
        })
        .select()
        .single()

      return { appointment }
    },
    "CreateAppointment"
  )
}
```

---

## Validation Schema Reference

### Appointment Schemas

#### GetAvailableSlotsSchema
```typescript
{
  professionalId: string (UUID)
  date: string (YYYY-MM-DD, today or future)
  serviceTypeId: string (UUID)
}
```

#### CreateAppointmentSchema
```typescript
{
  professionalId: string (UUID)
  serviceTypeId: string (UUID)
  appointmentDate: string (YYYY-MM-DD, today or future)
  startTime: string (HH:MM format, 06:00-22:00)
  notes?: string (max 500 chars)
  idempotencyKey?: string (optional)
}
```

#### CancelAppointmentSchema
```typescript
{
  appointmentId: string (UUID)
  reason?: string (max 200 chars)
}
```

#### RescheduleAppointmentSchema
```typescript
{
  appointmentId: string (UUID)
  newDate: string (YYYY-MM-DD, today or future)
  newStartTime: string (HH:MM format)
}
```

### Queue Schemas

#### CreateQueueTicketSchema
```typescript
{
  serviceTypeId: string (UUID)
  departmentId?: string (UUID)
  patientName?: string (2-100 chars)
  patientPhone?: string (valid phone)
  notes?: string (max 200 chars)
}
```

#### CallQueueTicketSchema
```typescript
{
  ticketId: string (UUID)
  roomId?: string (UUID)
}
```

### Notification Schemas

#### CreateNotificationSchema
```typescript
{
  userId: string (UUID)
  type: enum ["appointment_confirmation", "appointment_cancelled", ...]
  channel: enum ["email", "sms", "push", "in_app"]
  subject: string (1-200 chars)
  message: string (1-1000 chars)
  metadata?: Record<string, any>
}
```

---

## Integration Patterns

### Pattern 1: Simple Validation with withValidation

**Use when**: Single input validation

```typescript
export async function createAppointment(formData: unknown) {
  return withValidation(
    CreateAppointmentSchema,
    formData,
    async (validated) => {
      // Your logic here
      return { success: true }
    },
    "CreateAppointment"
  )
}
```

**Response on success:**
```json
{
  "success": true,
  "data": { "success": true }
}
```

**Response on validation error:**
```json
{
  "success": false,
  "error": "Validation failed: startTime: Time must be in HH:MM format (24-hour)",
  "details": {
    "startTime": ["Time must be in HH:MM format (24-hour)"]
  }
}
```

### Pattern 2: Quick Validation with validateOrFail

**Use when**: You want to validate and handle errors yourself

```typescript
export async function createAppointment(formData: unknown) {
  const validation = await validateOrFail(CreateAppointmentSchema, formData)

  if (!validation.valid) {
    return {
      error: "Invalid input",
      details: validation.errors,
    }
  }

  // validation.data is now typed and safe
  const { professionalId, appointmentDate, startTime } = validation.data

  // Your logic here
  return { success: true }
}
```

### Pattern 3: Batch Validation

**Use when**: Processing multiple items (bulk import, etc.)

```typescript
export async function cancelMultipleAppointments(formDataArray: unknown[]) {
  const validation = await validateArray(CancelAppointmentSchema, formDataArray, {
    maxItems: 100,
    stopOnFirstError: false, // Continue validating all items
  })

  if (!validation.valid) {
    return {
      error: "Some items failed validation",
      invalidCount: validation.invalidCount,
      errors: validation.errors,
    }
  }

  // validation.validated is array of validated items
  const results = await Promise.all(
    validation.validated.map((item) => 
      // Process each validated item
      supabase.from("appointments").update({ status: "cancelled" }).eq("id", item.appointmentId)
    )
  )

  return { cancelled: results.length }
}
```

### Pattern 4: Multiple Field Validation

**Use when**: Validating multiple independent fields

```typescript
export async function updateProfileAndSchedule(formData: unknown) {
  const validation = await validateMultiple(
    {
      profile: UpdateProfileSchema,
      schedule: UpdateScheduleSchema,
    },
    formData as any
  )

  if (!validation.valid) {
    return {
      error: "Validation failed",
      errors: validation.errors,
    }
  }

  const { profile, schedule } = validation.validated!

  // Now both are validated
  // profile contains: fullName?, phone?, email?, etc.
  // schedule contains: dayOfWeek, startTime, endTime, etc.

  return { success: true }
}
```

### Pattern 5: Conditional Validation

**Use when**: Different validation rules based on conditions

```typescript
import { conditionalValidate } from "@/lib/validators/validate"

export async function createQueueTicket(formData: unknown) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Different schema if authenticated vs. anonymous
  const validation = await conditionalValidate(
    !!user, // condition: is user authenticated?
    CreateQueueTicketSchema, // schema if true
    CreateQueueTicketSchema, // schema if false (same in this case)
    formData
  )

  if (!validation.valid) {
    return { error: "Invalid input", errors: validation.errors }
  }

  return { success: true }
}
```

---

## Implementing Validation in Each Domain

### Appointments Domain

```typescript
// lib/actions/appointments.ts

import { 
  CreateAppointmentSchema,
  CancelAppointmentSchema,
  RescheduleAppointmentSchema,
  CheckInAppointmentSchema,
  RateAppointmentSchema,
  GetAvailableSlotsSchema,
} from "@/lib/validators/schemas"
import { withValidation } from "@/lib/validators/validate"

export async function getAvailableSlots(formData: unknown) {
  return withValidation(
    GetAvailableSlotsSchema,
    formData,
    async (validated) => {
      // Call database function or query
      const slots = await appointmentService.getAvailableSlots(
        validated.professionalId,
        validated.date,
        validated.serviceTypeId
      )
      return { slots }
    },
    "GetAvailableSlots"
  )
}

export async function createAppointment(formData: unknown) {
  return withValidation(
    CreateAppointmentSchema,
    formData,
    async (validated) => {
      const supabase = await createServerClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) throw new Error("Not authenticated")

      // Use new database function for atomic creation
      const { data, error } = await supabase.rpc("create_appointment_safe", {
        p_patient_id: user.id,
        p_professional_id: validated.professionalId,
        p_service_type_id: validated.serviceTypeId,
        p_appointment_date: validated.appointmentDate,
        p_start_time: validated.startTime,
        p_notes: validated.notes || null,
      })

      if (!data?.[0]?.success) {
        throw new Error(data?.[0]?.error_message)
      }

      revalidatePath("/dashboard/appointments")
      return { appointmentId: data[0].appointment_id }
    },
    "CreateAppointment"
  )
}

export async function cancelAppointment(formData: unknown) {
  return withValidation(
    CancelAppointmentSchema,
    formData,
    async (validated) => {
      const supabase = await createServerClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) throw new Error("Not authenticated")

      const { data, error } = await supabase.rpc("cancel_appointment", {
        p_appointment_id: validated.appointmentId,
        p_user_id: user.id,
        p_reason: validated.reason || null,
      })

      if (!data?.[0]?.success) {
        throw new Error(data?.[0]?.message)
      }

      revalidatePath("/dashboard/appointments")
      return { success: true }
    },
    "CancelAppointment"
  )
}

export async function checkInAppointment(formData: unknown) {
  return withValidation(
    CheckInAppointmentSchema,
    formData,
    async (validated) => {
      const supabase = await createServerClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) throw new Error("Not authenticated")

      const { data } = await supabase
        .from("appointments")
        .update({ status: "checked_in" })
        .eq("id", validated.appointmentId)
        .eq("patient_id", user.id)
        .select()
        .single()

      revalidatePath("/dashboard/appointments")
      return { success: true }
    },
    "CheckInAppointment"
  )
}
```

### Queue Domain

```typescript
// lib/actions/queue.ts

import {
  CreateQueueTicketSchema,
  CallQueueTicketSchema,
  CompleteQueueTicketSchema,
  NoShowQueueTicketSchema,
  TransferQueueTicketSchema,
  GetQueuePositionSchema,
} from "@/lib/validators/schemas"
import { withValidation } from "@/lib/validators/validate"

export async function createQueueTicket(formData: unknown) {
  return withValidation(
    CreateQueueTicketSchema,
    formData,
    async (validated) => {
      const supabase = await createServerClient()
      const { data: { user } } = await supabase.auth.getUser()

      const { data: ticket } = await supabase
        .from("queue_tickets")
        .insert({
          service_type_id: validated.serviceTypeId,
          department_id: validated.departmentId || null,
          patient_id: user?.id || null,
          patient_name: validated.patientName || null,
          patient_phone: validated.patientPhone || null,
          status: "waiting",
        })
        .select()
        .single()

      if (user) {
        await supabase.from("notifications").insert({
          user_id: user.id,
          type: "queue_ready",
          channel: "email",
          subject: "Queue Ticket Created",
          message: `Ticket ${ticket.ticket_code} created. Wait to be called.`,
          queue_ticket_id: ticket.id,
          status: "pending",
        })
      }

      revalidatePath("/queue")
      return { ticket }
    },
    "CreateQueueTicket"
  )
}

export async function callQueueTicket(formData: unknown) {
  return withValidation(
    CallQueueTicketSchema,
    formData,
    async (validated) => {
      const supabase = await createServerClient()

      const { data, error } = await supabase.rpc("process_queue_ticket", {
        p_ticket_id: validated.ticketId,
        p_action: "call",
        p_room_id: validated.roomId || null,
      })

      if (!data?.[0]?.success) {
        throw new Error(data?.[0]?.message)
      }

      revalidatePath("/queue")
      return { success: true }
    },
    "CallQueueTicket"
  )
}

export async function getQueuePosition(formData: unknown) {
  return withValidation(
    GetQueuePositionSchema,
    formData,
    async (validated) => {
      const supabase = await createServerClient()

      const { data } = await supabase.rpc("get_queue_position", {
        p_ticket_id: validated.ticketId,
      })

      return {
        position: data?.[0]?.position,
        estimatedWaitMinutes: data?.[0]?.estimated_wait_minutes,
        currentServingCode: data?.[0]?.current_serving_code,
      }
    },
    "GetQueuePosition"
  )
}
```

### Notifications Domain

```typescript
// lib/actions/notifications.ts

import {
  CreateNotificationSchema,
  MarkNotificationReadSchema,
  RetryNotificationSchema,
} from "@/lib/validators/schemas"
import { withValidation } from "@/lib/validators/validate"

export async function createNotification(formData: unknown) {
  return withValidation(
    CreateNotificationSchema,
    formData,
    async (validated) => {
      const supabase = await createServerClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user || user.id !== validated.userId) {
        throw new Error("Not authorized")
      }

      const { data } = await supabase
        .from("notifications")
        .insert({
          user_id: validated.userId,
          type: validated.type,
          channel: validated.channel,
          subject: validated.subject,
          message: validated.message,
          status: "pending",
        })
        .select()
        .single()

      return { notificationId: data.id }
    },
    "CreateNotification"
  )
}

export async function retryNotification(formData: unknown) {
  return withValidation(
    RetryNotificationSchema,
    formData,
    async (validated) => {
      const supabase = await createServerClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user || !isUserAdmin(user.id)) {
        throw new Error("Not authorized")
      }

      // Get notification and retry with queueNotification
      const notification = await supabase
        .from("notifications")
        .select()
        .eq("id", validated.notificationId)
        .single()

      const { data } = await supabase
        .from("notifications")
        .update({ status: "pending" })
        .eq("id", validated.notificationId)

      return { success: true }
    },
    "RetryNotification"
  )
}
```

---

## Testing Validation

### Test in Client Component

```typescript
// app/dashboard/appointments/new/page.tsx
'use client'

import { useTransition } from 'react'
import { createAppointment } from '@/lib/actions/appointments'
import { CreateAppointmentSchema } from '@/lib/validators/schemas'
import type { CreateAppointmentInput } from '@/lib/validators/schemas'

export default function BookAppointmentPage() {
  const [isPending, startTransition] = useTransition()
  const [errors, setErrors] = useState<Record<string, string[]>>()

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    
    const data = {
      professionalId: formData.get('professionalId'),
      serviceTypeId: formData.get('serviceTypeId'),
      appointmentDate: formData.get('appointmentDate'),
      startTime: formData.get('startTime'),
      notes: formData.get('notes'),
    }

    startTransition(async () => {
      const result = await createAppointment(data)
      
      if (!result.success) {
        setErrors(result.details)
      } else {
        // Success - redirect or show message
        router.push('/dashboard/appointments')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      {errors?.startTime && (
        <p className="text-red-500">{errors.startTime.join(', ')}</p>
      )}
    </form>
  )
}
```

### Test with curl

```bash
# Test createAppointment with invalid time
curl -X POST http://localhost:3000/api/appointments/create \
  -H "Content-Type: application/json" \
  -d '{
    "professionalId": "550e8400-e29b-41d4-a716-446655440000",
    "serviceTypeId": "550e8400-e29b-41d4-a716-446655440001",
    "appointmentDate": "2024-02-20",
    "startTime": "25:00"
  }'

# Response:
{
  "success": false,
  "error": "Validation failed: startTime: Time must be in HH:MM format (24-hour)",
  "details": {
    "startTime": ["Time must be in HH:MM format (24-hour)"]
  }
}
```

---

## Migration Checklist

### For Each Server Action:

- [ ] Identify the input schema (appointment, queue, notification, etc.)
- [ ] Import schema from `lib/validators/schemas.ts`
- [ ] Wrap function with `withValidation()` or use `validateOrFail()`
- [ ] Update error handling to use consistent format
- [ ] Test with valid data
- [ ] Test with invalid data (wrong format, missing fields, invalid values)
- [ ] Update TypeScript type imports if needed
- [ ] Update frontend form validation to match schema

### Example Checklist for createAppointment:

- [x] Use `CreateAppointmentSchema`
- [x] Wrap with `withValidation()`
- [x] Validate UUID format for IDs
- [x] Validate date is in future
- [x] Validate time is in valid range (06:00-22:00)
- [x] Validate notes length
- [x] Return consistent error format
- [x] Test all validation rules

---

## Summary

By integrating Zod validation:

✅ **Type Safety**: All inputs are guaranteed to be correct type
✅ **Data Validation**: All inputs match business rules
✅ **Error Handling**: Consistent error responses
✅ **Security**: Prevents invalid data from reaching database
✅ **Consistency**: Same validation logic everywhere
✅ **Maintainability**: Schemas in one place
✅ **Documentation**: Schemas act as self-documenting API contracts

---

## Next: Webhook Idempotency

After completing validation integration, see the next guide for implementing idempotency in your notification webhooks to prevent duplicate sends.
