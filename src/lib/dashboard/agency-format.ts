import { isOverdue } from "./agency-filters";

const DAY_IN_MILLISECONDS = 86_400_000;

function startOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function formatDueDate(dueDate: string | null, now = new Date()) {
  if (!dueDate) return "No due date";
  const today = startOfDay(now).getTime();
  const due = startOfDay(new Date(dueDate)).getTime();
  const difference = Math.round((due - today) / DAY_IN_MILLISECONDS);

  if (difference === 0) return "Due today";
  if (difference === 1) return "Due tomorrow";
  if (difference === -1) return "1 day overdue";
  if (difference < -1) return `${Math.abs(difference)} days overdue`;

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(new Date(dueDate));
}

export function dueDateTone(dueDate: string | null, now = new Date()) {
  if (!dueDate) return "none" as const;
  if (isOverdue(dueDate, now)) return "overdue" as const;
  const difference =
    (startOfDay(new Date(dueDate)).getTime() - startOfDay(now).getTime()) /
    DAY_IN_MILLISECONDS;
  return difference <= 2 ? ("soon" as const) : ("scheduled" as const);
}

export function formatLastActivity(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}
