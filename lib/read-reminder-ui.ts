import { type TargetTime } from "@/lib/target-time";

export type ReadPendingReminder = {
  remindAt: string;
  remindTime: TargetTime;
};

export type ReadWithReminder = {
  id: string;
  url: string;
  title: string | null;
  pendingReminder: ReadPendingReminder | null;
};

export function readHasPendingReminder(read: ReadWithReminder) {
  return read.pendingReminder !== null;
}

export function readCanScheduleReminder() {
  return true;
}

export function readNeedsFinishConfirmation(read: ReadWithReminder) {
  if (read.pendingReminder === null) {
    return false;
  }

  return new Date(read.pendingReminder.remindAt).getTime() > Date.now();
}

export function readRemindDialogLabel(read: ReadWithReminder) {
  if (read.title !== null && read.title !== "") {
    return read.title;
  }
  return read.url;
}
