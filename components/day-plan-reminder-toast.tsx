import { toast } from "sonner";

import { trpcClient } from "@/trpc/client";

export function showDayPlanReminderScheduledToast(
  itemId: string,
  onCancelled: () => void,
) {
  toast("Reminder scheduled", {
    action: {
      label: "Undo",
      onClick: () => {
        trpcClient.dayPlan.cancelReminder
          .mutate({ itemId })
          .then(onCancelled, () => {
            toast.error("Could not cancel reminder");
          });
      },
    },
  });
}
