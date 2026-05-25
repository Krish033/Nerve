import { z } from "zod";

export const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(50, "Name too long"),
  mobile: z.string().regex(/^\+?[\d\s-]{10,}$/, "Invalid contact node format (min 10 digits)").or(z.string().length(0)),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;
