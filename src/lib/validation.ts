import { z } from 'zod';
import { isAllowedPushEndpoint } from './push-hosts';

export const mediaTypeSchema = z.enum(['graphic_design', 'photography', 'video_production']);
export const prioritySchema = z.enum(['low', 'medium', 'high', 'urgent']);
export const roleSchema = z.enum(['coordinator', 'student_head', 'requestor', 'team_member']);

const uuid = z.string().uuid();
const deadline = z.string().refine(v => !Number.isNaN(Date.parse(v)), 'Invalid date');
const text = (max: number) => z.string().trim().max(max);

export function safeHttpUrl(v: string): string | null {
  try {
    const u = new URL(v);
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : null;
  } catch {
    return null;
  }
}
const isHttpUrlOrEmpty = (v: string) => v === '' || safeHttpUrl(v) !== null;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(200),
  remember: z.boolean().optional(),
});

export const createRequestSchema = z.object({
  title: text(200).min(1),
  description: text(5000).min(1),
  mediaType: mediaTypeSchema,
  eventName: text(200).optional().default(''),
  targetPlatform: text(200).optional().default(''),
  styleReference: text(2000).refine(isHttpUrlOrEmpty, 'Must be an http(s) link').optional().default(''),
  deadline,
  priority: prioritySchema.optional().default('medium'),
});

export const decisionSchema = z.object({
  notes: text(2000).optional().default(''),
});

export const createTaskSchema = z.object({
  requestId: uuid.nullish(),
  assignedTo: uuid,
  title: text(200).min(1),
  description: text(5000).optional().default(''),
  mediaType: z.union([mediaTypeSchema, z.literal('')]).optional().default(''),
  priority: prioritySchema.optional().default('medium'),
  deadline,
  notes: text(5000).optional().default(''),
});

export const assignTaskSchema = z.object({ assignedTo: uuid });

export const taskStatusSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'completed']),
});

export const commentSchema = z.object({ content: text(5000).min(1) });

export const linkSchema = z.object({
  url: z.string().trim().max(2000).url().refine(u => /^https?:\/\//i.test(u), 'URL must be http(s)'),
  title: text(200).optional().default(''),
  description: text(1000).optional().default(''),
});

export const notificationIdSchema = z.object({ notificationId: uuid });

export const settingsSchema = z.object({
  maintenanceMode: z.boolean().optional(),
  emailNotifications: z.boolean().optional(),
});

export const pushSubscriptionSchema = z.object({
  subscription: z.object({
    endpoint: z.string().url().max(2000).refine(isAllowedPushEndpoint, 'Unsupported push endpoint'),
    keys: z.object({ p256dh: z.string().min(1).max(500), auth: z.string().min(1).max(500) }),
  }),
});

export const pushUnsubscribeSchema = z.object({ endpoint: z.string().url().max(2000) });

const email = z.string().trim().toLowerCase().email().max(254);

export const createUserSchema = z.object({
  email,
  name: text(100).min(1),
  role: roleSchema,
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z.object({
  token: z.string().min(20).max(200),
  newPassword: z.string().min(8, 'Must be at least 8 characters').max(72, 'Must be at most 72 characters'),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1).max(200),
    newPassword: z.string().min(8, 'Must be at least 8 characters').max(72, 'Must be at most 72 characters'),
  })
  .refine(d => d.currentPassword !== d.newPassword, {
    message: 'New password must be different',
    path: ['newPassword'],
  });
