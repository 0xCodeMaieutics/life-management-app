import {
  CloudSun,
  ListTodo,
  Moon,
  Sun,
  Sunrise,
  Sunset,
  type LucideIcon,
} from "lucide-react";

import {
  type DayPlanItemTargetTime,
  type TargetTime,
  parseTargetTimeToMinutes,
} from "@/lib/target-time";

export type { TargetTime };

export type TimedDaySegmentId =
  | "morning"
  | "noon"
  | "afternoon"
  | "evening"
  | "night";

export type DaySegmentId = TimedDaySegmentId | "anytime";

export type DaySegmentConfig = {
  id: DaySegmentId;
  label: string;
  /** Segment start boundary (`HH:mm`); omitted for **Anytime**. */
  targetTime?: TargetTime;
  icon: LucideIcon;
  iconClassName: string;
  nodeClassName: string;
};

export const TIMED_DAY_SEGMENTS: DaySegmentConfig[] = [
  {
    id: "morning",
    label: "Morning",
    targetTime: "05:00",
    icon: Sunrise,
    iconClassName: "text-amber-500",
    nodeClassName: "border-amber-200 bg-amber-50 text-amber-500",
  },
  {
    id: "noon",
    label: "Noon",
    targetTime: "11:00",
    icon: Sun,
    iconClassName: "text-yellow-500",
    nodeClassName: "border-yellow-200 bg-yellow-50 text-yellow-500",
  },
  {
    id: "afternoon",
    label: "Afternoon",
    targetTime: "14:00",
    icon: CloudSun,
    iconClassName: "text-sky-500",
    nodeClassName: "border-sky-200 bg-sky-50 text-sky-500",
  },
  {
    id: "evening",
    label: "Evening",
    targetTime: "17:00",
    icon: Sunset,
    iconClassName: "text-orange-500",
    nodeClassName: "border-orange-200 bg-orange-50 text-orange-500",
  },
  {
    id: "night",
    label: "Night",
    targetTime: "21:00",
    icon: Moon,
    iconClassName: "text-indigo-400",
    nodeClassName: "border-indigo-200 bg-indigo-50 text-indigo-400",
  },
];

export const ANYTIME_DAY_SEGMENT: DaySegmentConfig = {
  id: "anytime",
  label: "Anytime",
  icon: ListTodo,
  iconClassName: "text-muted-foreground",
  nodeClassName: "border-border bg-muted text-muted-foreground",
};

export const DAY_SEGMENT_DISPLAY_ORDER: DaySegmentConfig[] = [
  ...TIMED_DAY_SEGMENTS,
  ANYTIME_DAY_SEGMENT,
];

export function getTimedDaySegmentFromTargetTime(
  targetTime: TargetTime,
): TimedDaySegmentId {
  const minutes = parseTargetTimeToMinutes(targetTime);

  if (minutes >= 300 && minutes <= 659) {
    return "morning";
  }

  if (minutes >= 660 && minutes <= 839) {
    return "noon";
  }

  if (minutes >= 840 && minutes <= 1019) {
    return "afternoon";
  }

  if (minutes >= 1020 && minutes <= 1259) {
    return "evening";
  }

  return "night";
}

export type DayPlanItemPendingReminder = {
  remindAt: string;
  remindTime: TargetTime;
};

export type DayPlanItem = {
  id: string;
  title: string;
  targetTime: DayPlanItemTargetTime;
  completed: boolean;
  cancelled: boolean;
  isStepsLog: boolean;
  pendingReminder: DayPlanItemPendingReminder | null;
};

function dayPlanItemSortRank(item: DayPlanItem) {
  if (item.completed) {
    return 2;
  }
  if (item.cancelled) {
    return 1;
  }
  return 0;
}

function compareDayPlanItems(a: DayPlanItem, b: DayPlanItem) {
  const rankDiff = dayPlanItemSortRank(a) - dayPlanItemSortRank(b);
  if (rankDiff !== 0) {
    return rankDiff;
  }

  if (a.targetTime === null && b.targetTime === null) {
    return 0;
  }

  if (a.targetTime === null) {
    return 1;
  }

  if (b.targetTime === null) {
    return -1;
  }

  return a.targetTime.localeCompare(b.targetTime);
}

export function mapDayPlanItemsByDaySegment(items: DayPlanItem[]) {
  const itemsByDaySegment = new Map<DaySegmentId, DayPlanItem[]>();

  for (const item of items) {
    const segmentId =
      item.targetTime === null
        ? "anytime"
        : getTimedDaySegmentFromTargetTime(item.targetTime);
    const segmentItems = itemsByDaySegment.get(segmentId) ?? [];
    segmentItems.push(item);
    itemsByDaySegment.set(segmentId, segmentItems);
  }

  for (const segmentItems of itemsByDaySegment.values()) {
    segmentItems.sort(compareDayPlanItems);
  }

  return itemsByDaySegment;
}
