import * as z from "zod";

import { dayPlanItemReferenceSchema } from "@/lib/day-plan-item-reference";
import { isValidPlanDateString } from "@/lib/plan-date";
import { dayPlanItemTargetTimeSchema } from "@/lib/target-time";

export const deletedDayPlanItemSchema = z.object({
  id: z.uuid(),
  planDate: z.string().refine(isValidPlanDateString),
  title: z.string().min(1),
  targetTime: dayPlanItemTargetTimeSchema,
  completed: z.boolean(),
  cancelled: z.boolean(),
  todoId: z.uuid().nullable(),
  reference: dayPlanItemReferenceSchema.nullable(),
});

export type DeletedDayPlanItem = z.infer<typeof deletedDayPlanItemSchema>;
