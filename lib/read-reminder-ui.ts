import { getLocalDateString } from "@/lib/plan-date";
import {
  daysFromTodayToPlanDate,
  planDateFromRemindAt,
} from "@/lib/read-reminder-schedule";
import { type TargetTime } from "@/lib/target-time";

export type ReadPendingReminder = {
  remindAt: string;
  remindTime: TargetTime;
  planDate: string;
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

export type ReadRemindDialogDefaults = {
  remindTime: string;
  notToday: boolean;
  dayOffset: string;
};

export function readRemindDialogDefaults(
  read: ReadWithReminder,
): ReadRemindDialogDefaults {
  if (read.pendingReminder === null) {
    return {
      remindTime: "",
      notToday: false,
      dayOffset: "1",
    };
  }

  const planDate = read.pendingReminder.planDate;
  const today = getLocalDateString();
  const notToday = planDate !== today;
  const offset = daysFromTodayToPlanDate(planDate);

  return {
    remindTime: read.pendingReminder.remindTime,
    notToday,
    dayOffset: notToday ? String(Math.max(1, offset)) : "1",
  };
}

export function pendingReminderPlanDate(
  remindAt: Date,
  timeZone: string,
): string {
  return planDateFromRemindAt(remindAt, timeZone);
}
