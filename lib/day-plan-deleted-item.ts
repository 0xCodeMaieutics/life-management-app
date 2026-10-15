import * as z from "zod";

import { isValidPlanDateString } from "@/lib/plan-date";
import { dayPlanItemTargetTimeSchema } from "@/lib/target-time";

export const deletedDayPlanItemSchema = z.object({
  id: z.uuid(),
  planDate: z.string().refine(isValidPlanDateString),
  title: z.string().min(1),
  targetTime: dayPlanItemTargetTimeSchema,
  completed: z.boolean(),
});

export type DeletedDayPlanItem = z.infer<typeof deletedDayPlanItemSchema>;
