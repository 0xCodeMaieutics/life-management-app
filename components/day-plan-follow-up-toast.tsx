import { toast } from "sonner";

import { formatFollowUpSendAt } from "@/lib/follow-up";
import { trpcClient } from "@/trpc/client";

export function showDayPlanFollowUpScheduledToast(
  itemId: string,
  sendAt: string,
  onCancelled: () => void,
) {
  toast(`Follow-up scheduled for ${formatFollowUpSendAt(sendAt)}`, {
    action: {
      label: "Undo",
      onClick: () => {
        trpcClient.dayPlan.cancelFollowUp
          .mutate({ itemId })
          .then(onCancelled, () => {
            toast.error("Could not cancel follow-up");
          });
      },
    },
  });
}
