import { z } from "zod"

// ============================================================================
// APPOINTMENT SCHEMAS
// ============================================================================

/**
 * Schema for getting available appointment slots
 * Validates: professionalId (UUID), date (ISO date), serviceTypeId (UUID)
 */
export const GetAvailableSlotsSchema = z.object({
  professionalId: z.string().uuid("Invalid professional ID"),
  date: z
    .string()
    .date("Date must be in YYYY-MM-DD format")
    .refine(
      (date) => {
        const d = new Date(date)
        return d >= new Date(new Date().setHours(0, 0, 0, 0))
      },
      "Date must be today or in the future"
    ),
  serviceTypeId: z.string().uuid("Invalid service type ID"),
})

export type GetAvailableSlotsInput = z.infer<typeof GetAvailableSlotsSchema>

/**
 * Schema for creating an appointment
 * Validates: professional, service type, date, time, optional notes
 */
export const CreateAppointmentSchema = z.object({
  professionalId: z.string().uuid("Invalid professional ID"),
  serviceTypeId: z.string().uuid("Invalid service type ID"),
  appointmentDate: z
    .string()
    .date("Date must be in YYYY-MM-DD format")
    .refine(
      (date) => {
        const d = new Date(date)
        return d >= new Date(new Date().setHours(0, 0, 0, 0))
      },
      "Appointment date must be today or in the future"
    ),
  startTime: z
    .string()
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, "Time must be in HH:MM format (24-hour)")
    .refine(
      (time) => {
        const [hours, minutes] = time.split(":").map(Number)
        // Appointment must be between 6 AM and 10 PM
        const totalMinutes = hours * 60 + minutes
        return totalMinutes >= 360 && totalMinutes <= 1320
      },
      "Appointments must be between 06:00 and 22:00"
    ),
  notes: z.string().max(500, "Notes must be 500 characters or less").optional(),
  idempotencyKey: z.string().optional(),
})

export type CreateAppointmentInput = z.infer<typeof CreateAppointmentSchema>

/**
 * Schema for cancelling an appointment
 */
export const CancelAppointmentSchema = z.object({
  appointmentId: z.string().uuid("Invalid appointment ID"),
  reason: z.string().max(200, "Reason must be 200 characters or less").optional(),
})

export type CancelAppointmentInput = z.infer<typeof CancelAppointmentSchema>

/**
 * Schema for checking in to an appointment
 */
export const CheckInAppointmentSchema = z.object({
  appointmentId: z.string().uuid("Invalid appointment ID"),
})

export type CheckInAppointmentInput = z.infer<typeof CheckInAppointmentSchema>

/**
 * Schema for rescheduling an appointment
 */
export const RescheduleAppointmentSchema = z.object({
  appointmentId: z.string().uuid("Invalid appointment ID"),
  newDate: z
    .string()
    .date("Date must be in YYYY-MM-DD format")
    .refine(
      (date) => {
        const d = new Date(date)
        return d >= new Date(new Date().setHours(0, 0, 0, 0))
      },
      "New date must be today or in the future"
    ),
  newStartTime: z
    .string()
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, "Time must be in HH:MM format"),
})

export type RescheduleAppointmentInput = z.infer<typeof RescheduleAppointmentSchema>

/**
 * Schema for rating an appointment
 */
export const RateAppointmentSchema = z.object({
  appointmentId: z.string().uuid("Invalid appointment ID"),
  rating: z.number().min(1, "Rating must be at least 1").max(5, "Rating must be at most 5"),
  comment: z.string().max(500, "Comment must be 500 characters or less").optional(),
})

export type RateAppointmentInput = z.infer<typeof RateAppointmentSchema>

// ============================================================================
// QUEUE SCHEMAS
// ============================================================================

/**
 * Schema for creating a queue ticket
 */
export const CreateQueueTicketSchema = z.object({
  serviceTypeId: z.string().uuid("Invalid service type ID"),
  departmentId: z.string().uuid("Invalid department ID").optional(),
  patientName: z
    .string()
    .min(2, "Patient name must be at least 2 characters")
    .max(100, "Patient name must be 100 characters or less")
    .optional(),
  patientPhone: z
    .string()
    .regex(/^\+?[0-9\s\-\(\)]+$/, "Invalid phone number format")
    .max(20, "Phone number must be 20 characters or less")
    .optional(),
  notes: z.string().max(200, "Notes must be 200 characters or less").optional(),
})

export type CreateQueueTicketInput = z.infer<typeof CreateQueueTicketSchema>

/**
 * Schema for calling a queue ticket
 */
export const CallQueueTicketSchema = z.object({
  ticketId: z.string().uuid("Invalid ticket ID"),
  roomId: z.string().uuid("Invalid room ID").optional(),
})

export type CallQueueTicketInput = z.infer<typeof CallQueueTicketSchema>

/**
 * Schema for completing a queue ticket
 */
export const CompleteQueueTicketSchema = z.object({
  ticketId: z.string().uuid("Invalid ticket ID"),
})

export type CompleteQueueTicketInput = z.infer<typeof CompleteQueueTicketSchema>

/**
 * Schema for marking a queue ticket as no-show
 */
export const NoShowQueueTicketSchema = z.object({
  ticketId: z.string().uuid("Invalid ticket ID"),
  reason: z.string().max(200, "Reason must be 200 characters or less").optional(),
})

export type NoShowQueueTicketInput = z.infer<typeof NoShowQueueTicketSchema>

/**
 * Schema for transferring a queue ticket
 */
export const TransferQueueTicketSchema = z.object({
  ticketId: z.string().uuid("Invalid ticket ID"),
  professionalId: z.string().uuid("Invalid professional ID"),
})

export type TransferQueueTicketInput = z.infer<typeof TransferQueueTicketSchema>

/**
 * Schema for getting queue position
 */
export const GetQueuePositionSchema = z.object({
  ticketId: z.string().uuid("Invalid ticket ID"),
})

export type GetQueuePositionInput = z.infer<typeof GetQueuePositionSchema>

// ============================================================================
// NOTIFICATION SCHEMAS
// ============================================================================

/**
 * Schema for creating a manual notification
 */
export const CreateNotificationSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
  type: z.enum([
    "appointment_confirmation",
    "appointment_cancelled",
    "appointment_reminder",
    "queue_ready",
    "queue_called",
    "service_update",
    "system_alert",
  ]),
  channel: z.enum(["email", "sms", "push", "in_app"]),
  subject: z.string().min(1, "Subject is required").max(200, "Subject must be 200 characters or less"),
  message: z.string().min(1, "Message is required").max(1000, "Message must be 1000 characters or less"),
  metadata: z.record(z.any()).optional(),
})

export type CreateNotificationInput = z.infer<typeof CreateNotificationSchema>

/**
 * Schema for marking notification as read
 */
export const MarkNotificationReadSchema = z.object({
  notificationId: z.string().uuid("Invalid notification ID"),
})

export type MarkNotificationReadInput = z.infer<typeof MarkNotificationReadSchema>

/**
 * Schema for retrying a failed notification
 */
export const RetryNotificationSchema = z.object({
  notificationId: z.string().uuid("Invalid notification ID"),
  channel: z.enum(["email", "sms", "push"]).optional(),
})

export type RetryNotificationInput = z.infer<typeof RetryNotificationSchema>

// ============================================================================
// ADMIN/PROFESSIONAL SCHEMAS
// ============================================================================

/**
 * Schema for updating professional schedule
 */
export const UpdateScheduleSchema = z.object({
  professionalId: z.string().uuid("Invalid professional ID"),
  dayOfWeek: z.number().min(0, "Day of week must be 0-6").max(6, "Day of week must be 0-6"),
  startTime: z
    .string()
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, "Time must be in HH:MM format"),
  endTime: z
    .string()
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, "Time must be in HH:MM format"),
  isActive: z.boolean().optional(),
})

export type UpdateScheduleInput = z.infer<typeof UpdateScheduleSchema>

/**
 * Schema for creating schedule exception
 */
export const CreateScheduleExceptionSchema = z.object({
  professionalId: z.string().uuid("Invalid professional ID"),
  date: z
    .string()
    .date("Date must be in YYYY-MM-DD format")
    .refine(
      (date) => {
        const d = new Date(date)
        return d >= new Date(new Date().setHours(0, 0, 0, 0))
      },
      "Date must be today or in the future"
    ),
  isAvailable: z.boolean().default(true),
  startTime: z
    .string()
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, "Time must be in HH:MM format")
    .optional(),
  endTime: z
    .string()
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, "Time must be in HH:MM format")
    .optional(),
  reason: z.string().max(200, "Reason must be 200 characters or less").optional(),
})

export type CreateScheduleExceptionInput = z.infer<typeof CreateScheduleExceptionSchema>

/**
 * Schema for creating a service type
 */
export const CreateServiceTypeSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be 100 characters or less"),
  description: z.string().max(500, "Description must be 500 characters or less").optional(),
  durationMinutes: z
    .number()
    .min(5, "Duration must be at least 5 minutes")
    .max(480, "Duration must be 8 hours or less")
    .int("Duration must be a whole number"),
  price: z
    .number()
    .min(0, "Price cannot be negative")
    .optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, "Color must be a valid hex color").optional(),
  isActive: z.boolean().optional(),
})

export type CreateServiceTypeInput = z.infer<typeof CreateServiceTypeSchema>

/**
 * Schema for updating professional profile
 */
export const UpdateProfessionalSchema = z.object({
  professionalId: z.string().uuid("Invalid professional ID"),
  name: z.string().min(1, "Name is required").max(100, "Name must be 100 characters or less").optional(),
  email: z.string().email("Invalid email address").optional(),
  phone: z
    .string()
    .regex(/^\+?[0-9\s\-\(\)]+$/, "Invalid phone number format")
    .optional(),
  specialty: z.string().max(100, "Specialty must be 100 characters or less").optional(),
  licenseNumber: z.string().max(50, "License number must be 50 characters or less").optional(),
  bio: z.string().max(500, "Bio must be 500 characters or less").optional(),
  isActive: z.boolean().optional(),
})

export type UpdateProfessionalInput = z.infer<typeof UpdateProfessionalSchema>

// ============================================================================
// PROFILE SCHEMAS
// ============================================================================

/**
 * Schema for updating user profile
 */
export const UpdateProfileSchema = z.object({
  fullName: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be 100 characters or less")
    .optional(),
  phone: z
    .string()
    .regex(/^\+?[0-9\s\-\(\)]+$/, "Invalid phone number format")
    .max(20, "Phone number must be 20 characters or less")
    .optional(),
  email: z.string().email("Invalid email address").optional(),
  birthDate: z
    .string()
    .date("Date must be in YYYY-MM-DD format")
    .optional(),
  bloodType: z.enum(["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"]).optional(),
  allergies: z.string().max(500, "Allergies must be 500 characters or less").optional(),
  emergencyContactName: z.string().max(100, "Emergency contact name must be 100 characters or less").optional(),
  emergencyContactPhone: z
    .string()
    .regex(/^\+?[0-9\s\-\(\)]+$/, "Invalid phone number format")
    .optional(),
})

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>

// ============================================================================
// VALIDATION HELPER FUNCTION
// ============================================================================

/**
 * Generic validation function with consistent error handling
 */
export async function validateInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  fieldName: string = "input"
): Promise<{
  success: boolean
  data?: T
  errors?: Record<string, string[]>
}> {
  try {
    const validatedData = schema.parse(data)
    return { success: true, data: validatedData }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string[]> = {}
      error.issues.forEach((issue) => {
        const path = issue.path.join(".")
        if (!errors[path]) {
          errors[path] = []
        }
        errors[path].push(issue.message)
      })
      return { success: false, errors }
    }

    return {
      success: false,
      errors: { [fieldName]: ["Validation failed"] },
    }
  }
}

/**
 * Error formatter for API responses
 */
export function formatValidationErrors(errors: Record<string, string[]>): string {
  return Object.entries(errors)
    .map(([field, messages]) => `${field}: ${messages.join(", ")}`)
    .join("\n")
}

// ============================================================================
// COMBINED SCHEMAS (for complex operations)
// ============================================================================

/**
 * Schema for batch operations
 */
export const BatchOperationSchema = z.object({
  operation: z.enum(["create", "update", "delete"]),
  type: z.enum(["appointments", "queue_tickets", "schedules"]),
  items: z.array(z.record(z.any())).min(1, "At least one item is required").max(100, "Maximum 100 items allowed"),
})

export type BatchOperationInput = z.infer<typeof BatchOperationSchema>

/**
 * Schema for analytics query
 */
export const AnalyticsQuerySchema = z.object({
  startDate: z
    .string()
    .date("Date must be in YYYY-MM-DD format")
    .optional(),
  endDate: z
    .string()
    .date("Date must be in YYYY-MM-DD format")
    .optional(),
  groupBy: z.enum(["day", "week", "month", "professional"]).optional(),
  filters: z
    .object({
      professionalId: z.string().uuid().optional(),
      departmentId: z.string().uuid().optional(),
      status: z.string().optional(),
    })
    .optional(),
})

export type AnalyticsQueryInput = z.infer<typeof AnalyticsQuerySchema>

// ============================================================================
// EXPORT ALL SCHEMAS
// ============================================================================

export const AllSchemas = {
  // Appointments
  GetAvailableSlotsSchema,
  CreateAppointmentSchema,
  CancelAppointmentSchema,
  CheckInAppointmentSchema,
  RescheduleAppointmentSchema,
  RateAppointmentSchema,

  // Queue
  CreateQueueTicketSchema,
  CallQueueTicketSchema,
  CompleteQueueTicketSchema,
  NoShowQueueTicketSchema,
  TransferQueueTicketSchema,
  GetQueuePositionSchema,

  // Notifications
  CreateNotificationSchema,
  MarkNotificationReadSchema,
  RetryNotificationSchema,

  // Admin
  UpdateScheduleSchema,
  CreateScheduleExceptionSchema,
  CreateServiceTypeSchema,
  UpdateProfessionalSchema,

  // Profile
  UpdateProfileSchema,

  // Complex
  BatchOperationSchema,
  AnalyticsQuerySchema,
}
