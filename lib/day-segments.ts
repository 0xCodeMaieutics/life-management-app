import {
  CloudSun,
  ListTodo,
  Moon,
  Sun,
  Sunrise,
  Sunset,
  type LucideIcon,
} from "lucide-react";

import { parseTargetTimeToMinutes } from "@/lib/target-time";

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
  icon: LucideIcon;
  iconClassName: string;
  nodeClassName: string;
};

export const TIMED_DAY_SEGMENTS: DaySegmentConfig[] = [
  {
    id: "morning",
    label: "Morning",
    icon: Sunrise,
    iconClassName: "text-amber-500",
    nodeClassName: "border-amber-200 bg-amber-50 text-amber-500",
  },
  {
    id: "noon",
    label: "Noon",
    icon: Sun,
    iconClassName: "text-yellow-500",
    nodeClassName: "border-yellow-200 bg-yellow-50 text-yellow-500",
  },
  {
    id: "afternoon",
    label: "Afternoon",
    icon: CloudSun,
    iconClassName: "text-sky-500",
    nodeClassName: "border-sky-200 bg-sky-50 text-sky-500",
  },
  {
    id: "evening",
    label: "Evening",
    icon: Sunset,
    iconClassName: "text-orange-500",
    nodeClassName: "border-orange-200 bg-orange-50 text-orange-500",
  },
  {
    id: "night",
    label: "Night",
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
  targetTime: string,
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

export type DayPlanItemForGrouping = {
  id: string;
  title: string;
  targetTime: string | null;
  completed: boolean;
};

function compareDayPlanItems(a: DayPlanItemForGrouping, b: DayPlanItemForGrouping) {
  if (a.completed !== b.completed) {
    return a.completed ? 1 : -1;
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

export function groupDayPlanItemsBySegment(items: DayPlanItemForGrouping[]) {
  const grouped = new Map<DaySegmentId, DayPlanItemForGrouping[]>();

  for (const item of items) {
    const segmentId =
      item.targetTime === null
        ? "anytime"
        : getTimedDaySegmentFromTargetTime(item.targetTime);
    const segmentItems = grouped.get(segmentId) ?? [];
    segmentItems.push(item);
    grouped.set(segmentId, segmentItems);
  }

  for (const segmentItems of grouped.values()) {
    segmentItems.sort(compareDayPlanItems);
  }

  return grouped;
}
