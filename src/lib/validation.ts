import { z } from "zod";

export const signInSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const signUpSchema = signInSchema.extend({
  name: z.string().min(2, "Name must be at least 2 characters"),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const workspaceNameSchema = z.string()
  .trim()
  .min(2, "Workspace name must be at least 2 characters")
  .max(100, "Workspace name must be 100 characters or fewer");

export const projectTitleSchema = z.string()
  .trim()
  .min(3, "Title must be at least 3 characters")
  .max(255, "Title must be 255 characters or fewer");

export const taskTitleSchema = z.string()
  .trim()
  .min(3, "Task title must be at least 3 characters")
  .max(255, "Task title must be 255 characters or fewer");

export const taskStatusSchema = z.enum(["todo", "in_progress", "done"], {
  error: () => ({ message: "Task status must be todo, in_progress, or done" })
});

export const projectStatusSchema = z.enum(["active", "paused", "completed"], {
  error: () => ({ message: "Project status must be active, paused, or completed" })
});

export const inviteEmailSchema = z.string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address");

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type WorkspaceNameInput = z.infer<typeof workspaceNameSchema>;
export type ProjectTitleInput = z.infer<typeof projectTitleSchema>;
export type TaskTitleInput = z.infer<typeof taskTitleSchema>;
export type TaskStatusInput = z.infer<typeof taskStatusSchema>;
export type ProjectStatusInput = z.infer<typeof projectStatusSchema>;
export type InviteEmailInput = z.infer<typeof inviteEmailSchema>;
