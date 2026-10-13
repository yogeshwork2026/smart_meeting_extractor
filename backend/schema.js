import { z } from 'zod';

/**
 * Single source of truth for the AI output shape. Converted with zod-to-json-schema
 * to constrain the model, then reused to validate whatever comes back.
 */
const taskSchema = z.object({
  task: z.string().min(1).describe('The actionable item discussed in the meeting'),
  owner: z.string().min(1).describe('Person responsible, "Unassigned" if unclear'),
  priority: z.enum(['low', 'medium', 'high']).describe('Urgency of the task'),
  due_date: z.string().nullable().describe('Due date as written in the notes, else null'),
});

export const extractionSchema = z.object({
  tasks: z.array(taskSchema),
});

export const notesSchema = z.object({
  notes: z
    .string({ required_error: 'notes is required' })
    .trim()
    .min(10, 'Please provide at least 10 characters of meeting notes')
    .max(20000, 'Notes are too long, keep them under 20000 characters'),
});
