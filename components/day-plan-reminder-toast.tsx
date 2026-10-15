import { toast } from "sonner";

import { cancelDayPlanItemReminder } from "@/app/(app)/day-plan/reminder-actions";

export function showDayPlanReminderScheduledToast(itemId: string) {
  toast("Reminder scheduled", {
    action: {
      label: "Undo",
      onClick: () => {
        void cancelDayPlanItemReminder(itemId).then((result) => {
          if (!result.ok) {
            toast.error("Could not cancel reminder");
          }
        });
      },
    },
  });
}
