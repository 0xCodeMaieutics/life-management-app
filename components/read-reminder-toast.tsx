import { toast } from "sonner";

import { trpcClient } from "@/trpc/client";

export function showReadReminderScheduledToast(
  readId: string,
  onCancelled: () => void,
) {
  toast("Reminder scheduled", {
    action: {
      label: "Undo",
      onClick: () => {
        trpcClient.read.cancelReminder
          .mutate({ readId })
          .then(onCancelled, () => {
            toast.error("Could not cancel reminder");
          });
      },
    },
  });
}
