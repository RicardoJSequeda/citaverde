import { z } from "zod"
import { validateInput, formatValidationErrors } from "./schemas"

// ============================================================================
// VALIDATION MIDDLEWARE
// ============================================================================

/**
 * Wrap server actions with automatic validation
 * Handles error responses consistently
 */
export async function withValidation<T, R>(
  schema: z.ZodSchema<T>,
  data: unknown,
  handler: (validated: T) => Promise<R>,
  operationName: string = "Operation"
): Promise<
  | { success: true; data: R }
  | { success: false; error: string; details?: Record<string, string[]> }
> {
  try {
    const result = await validateInput(schema, data, operationName)

    if (!result.success) {
      return {
        success: false,
        error: `Validation failed: ${formatValidationErrors(result.errors || {})}`,
        details: result.errors,
      }
    }

    const response = await handler(result.data!)

    return {
      success: true,
      data: response,
    }
  } catch (error) {
    console.error(`${operationName} error:`, error)
    const message = error instanceof Error ? error.message : "An unexpected error occurred"

    return {
      success: false,
      error: message,
    }
  }
}

/**
 * Validate data and return early if invalid
 * Useful for quick inline validation
 */
export async function validateOrFail<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): Promise<{ valid: false; errors: Record<string, string[]> } | { valid: true; data: T }> {
  const result = await validateInput(schema, data)

  if (!result.success) {
    return {
      valid: false,
      errors: result.errors || {},
    }
  }

  return {
    valid: true,
    data: result.data!,
  }
}

// ============================================================================
// RESPONSE FORMATTERS
// ============================================================================

/**
 * Success response formatter
 */
export function successResponse<T>(data: T, message?: string) {
  return {
    success: true,
    data,
    message: message || "Operation completed successfully",
  }
}

/**
 * Error response formatter
 */
export function errorResponse(
  error: string,
  code?: string,
  details?: Record<string, string[]>
) {
  return {
    success: false,
    error,
    code: code || "UNKNOWN_ERROR",
    details,
  }
}

/**
 * Validation error response formatter
 */
export function validationErrorResponse(errors: Record<string, string[]>) {
  return {
    success: false,
    error: "Validation failed",
    code: "VALIDATION_ERROR",
    details: errors,
  }
}

// ============================================================================
// EXAMPLE USAGE IN SERVER ACTIONS
// ============================================================================

/*
// BEFORE (without validation):
export async function createAppointment(formData: CreateAppointmentInput) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  // Risky: what if formData.appointmentDate is invalid?
  // What if startTime is "25:00"?
  // What if notes are 10000 characters?

  // Create appointment... (rest of code)
}

// AFTER (with validation):
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

      // Now validated has correct types and is safe
      // validated.appointmentDate is valid date string
      // validated.startTime is valid time in 24-hour format
      // validated.notes is max 500 characters

      // Create appointment... (rest of code)
      // Return data
      return { appointmentId: "..." }
    },
    "CreateAppointment"
  )
}
*/

// ============================================================================
// VALIDATION CHAINS
// ============================================================================

/**
 * Validate multiple related inputs in sequence
 */
export async function validateMultiple<T extends Record<string, unknown>>(
  schemas: Record<string, z.ZodSchema>,
  data: T
): Promise<{
  valid: boolean
  validated?: Partial<T>
  errors?: Record<string, Record<string, string[]>>
}> {
  const validated: Partial<T> = {}
  const errors: Record<string, Record<string, string[]>> = {}

  for (const [field, schema] of Object.entries(schemas)) {
    const result = await validateInput(schema, data[field], field)

    if (!result.success) {
      errors[field] = result.errors || {}
    } else {
      validated[field as keyof T] = result.data as any
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    validated: Object.keys(errors).length === 0 ? validated : undefined,
    errors: Object.keys(errors).length > 0 ? errors : undefined,
  }
}

// ============================================================================
// CONDITIONAL VALIDATION
// ============================================================================

/**
 * Validate based on conditions
 * Example: Different schema if user is authenticated vs. anonymous
 */
export async function conditionalValidate<T>(
  condition: boolean,
  schemaIfTrue: z.ZodSchema<T>,
  schemaIfFalse: z.ZodSchema<T>,
  data: unknown
): Promise<{ valid: boolean; data?: T; errors?: Record<string, string[]> }> {
  const schema = condition ? schemaIfTrue : schemaIfFalse
  return validateOrFail(schema, data)
}

// ============================================================================
// BATCH VALIDATION
// ============================================================================

/**
 * Validate array of items
 */
export async function validateArray<T>(
  schema: z.ZodSchema<T>,
  items: unknown[],
  options?: {
    maxItems?: number
    stopOnFirstError?: boolean
  }
): Promise<{
  valid: boolean
  validated?: T[]
  errors?: Record<number, Record<string, string[]>>
  invalidCount?: number
}> {
  const { maxItems = 1000, stopOnFirstError = false } = options || {}

  if (items.length > maxItems) {
    return {
      valid: false,
      errors: {
        0: { root: [`Maximum ${maxItems} items allowed`] },
      },
    }
  }

  const validated: T[] = []
  const errors: Record<number, Record<string, string[]>> = {}

  for (let i = 0; i < items.length; i++) {
    const result = await validateInput(schema, items[i], `items[${i}]`)

    if (!result.success) {
      errors[i] = result.errors || {}
      if (stopOnFirstError) break
    } else {
      validated.push(result.data!)
    }
  }

  const hasErrors = Object.keys(errors).length > 0

  return {
    valid: !hasErrors,
    validated: !hasErrors ? validated : undefined,
    errors: hasErrors ? errors : undefined,
    invalidCount: Object.keys(errors).length,
  }
}

// ============================================================================
// SANITIZATION HELPERS
// ============================================================================

/**
 * Sanitize user input to prevent XSS
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/[<>]/g, "") // Remove < and >
    .trim()
}

/**
 * Validate and sanitize email
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate and sanitize phone
 */
export function validatePhone(phone: string): boolean {
  const phoneRegex = /^\+?[0-9\s\-\(\)]+$/
  return phoneRegex.test(phone) && phone.length >= 10 && phone.length <= 20
}

/**
 * Validate UUID
 */
export function validateUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(id)
}

/**
 * Validate date is in future
 */
export function isFutureDate(dateString: string): boolean {
  const date = new Date(dateString)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return date >= today
}

/**
 * Validate time format
 */
export function isValidTimeFormat(timeString: string): boolean {
  const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/
  return timeRegex.test(timeString)
}

// ============================================================================
// USAGE IN SERVER ACTIONS - REAL EXAMPLES
// ============================================================================

/*
// EXAMPLE 1: Simple validation with error handling
'use server'
import { CreateAppointmentSchema } from '@acme/shared'
import { withValidation, validationErrorResponse } from '@/lib/validators/validate'

export async function createAppointment(formData: unknown) {
  return withValidation(
    CreateAppointmentSchema,
    formData,
    async (validated) => {
      const supabase = await createServerClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) throw new Error('Not authenticated')

      // Now validated data is 100% safe
      // - Valid UUID values
      // - Valid date format and future date
      // - Valid time format and reasonable hours
      // - Notes <= 500 chars

      // Call database function for atomic creation
      const { data, error } = await supabase.rpc('create_appointment_safe', {
        p_patient_id: user.id,
        p_professional_id: validated.professionalId,
        p_service_type_id: validated.serviceTypeId,
        p_appointment_date: validated.appointmentDate,
        p_start_time: validated.startTime,
        p_notes: validated.notes,
      })

      if (!data?.[0]?.success) {
        throw new Error(data?.[0]?.error_message || 'Failed to create appointment')
      }

      return { appointmentId: data[0].appointment_id }
    },
    'CreateAppointment'
  )
}

// EXAMPLE 2: Conditional validation
'use server'
import { CreateQueueTicketSchema } from '@acme/shared'
import { withValidation } from '@/lib/validators/validate'

export async function createQueueTicket(formData: unknown) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Different schema if authenticated
  const schema = user ? CreateQueueTicketSchema : CreateQueueTicketSchema

  return withValidation(schema, formData, async (validated) => {
    // Process queue ticket creation
    const { data: ticket } = await supabase
      .from('queue_tickets')
      .insert({
        organization_id: '...',
        service_type_id: validated.serviceTypeId,
        patient_id: user?.id,
        patient_name: validated.patientName,
        patient_phone: validated.patientPhone,
        status: 'waiting',
      })
      .select()
      .single()

    return { ticketId: ticket.id }
  }, 'CreateQueueTicket')
}

// EXAMPLE 3: Batch validation
'use server'
import { CancelAppointmentSchema } from '@acme/shared'
import { validateArray, errorResponse } from '@/lib/validators/validate'

export async function cancelMultipleAppointments(formDataArray: unknown[]) {
  const validation = await validateArray(CancelAppointmentSchema, formDataArray, {
    maxItems: 100,
    stopOnFirstError: false,
  })

  if (!validation.valid) {
    return errorResponse('Some appointments failed validation', 'VALIDATION_ERROR', validation.errors)
  }

  // Process cancellations
  // All items are now validated
  const results = await Promise.all(
    validation.validated!.map((item) => cancelAppointment(item))
  )

  return { cancelled: results.length }
}

// EXAMPLE 4: Multiple field validation
'use server'
import { validateMultiple } from '@/lib/validators/validate'
import { UpdateProfileSchema, UpdateScheduleSchema } from '@acme/shared'

export async function updateProfileAndSchedule(formData: unknown) {
  const validation = await validateMultiple(
    {
      profile: UpdateProfileSchema,
      schedule: UpdateScheduleSchema,
    },
    formData as any
  )

  if (!validation.valid) {
    return { error: 'Validation failed', details: validation.errors }
  }

  // Both profile and schedule are now validated
  // Process both updates
  return { success: true }
}
*/

// ============================================================================
// EXPORT ALL VALIDATION UTILITIES
// ============================================================================

export const ValidationUtils = {
  withValidation,
  validateOrFail,
  successResponse,
  errorResponse,
  validationErrorResponse,
  validateMultiple,
  conditionalValidate,
  validateArray,
  sanitizeString,
  validateEmail,
  validatePhone,
  validateUUID,
  isFutureDate,
  isValidTimeFormat,
}
