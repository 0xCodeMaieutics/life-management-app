import { toast } from "sonner";

import { cancelReadReminder } from "@/app/(app)/later-reads/reminder-actions";

export function showReadReminderScheduledToast(readId: string) {
  toast("Reminder scheduled", {
    action: {
      label: "Undo",
      onClick: () => {
        void cancelReadReminder(readId).then((result) => {
          if (!result.ok) {
            toast.error("Could not cancel reminder");
          }
        });
      },
    },
  });
}
