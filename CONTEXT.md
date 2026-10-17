# Life management

Planning and tracking daily intentions and longer-running personal affairs. The first release assumes a single implicit user per deployment (no login, no per-row user identity).

## Language

**Matter**:
A longer-running affair tracked outside the day-plan flow (documents, attachments, categories). Unrelated to day plans in the first release; the matter feature is unchanged until a later design links them.

**Day plan**:
A dated plan for what to do on a specific calendar day, made up of day plan items. The date is the user’s local calendar date (same convention as the bioenergetic diary URL). A day plan may be created for any date the user can select (past, today, or future). At most one day plan per calendar date. If none exists for the selected date, the day plan page shows a control to create one (no plan row until the user does). If every day plan item is removed, the day plan is removed as well and the **Create day plan** control returns.
_Avoid_: Diary

**Day plan item**:
One entry on a day plan: title, optional target time, whether it is completed for that day, and whether it is cancelled for that day. The completion flag is stored in code as `completed`; the cancelled flag is stored as `cancelled`. Values are copied from todos when the item is created; later todo edits do not change existing day plan items. When the item is created from a **todo**, it may also store which **todo** it came from; that link is for navigation only (e.g. **Go to original todo**), not for syncing title or **target time**. If the **todo** is deleted, the link is cleared; the item keeps its snapshot fields. On an existing day plan, the user can mark items complete or incomplete (except a **steps log**, which is always complete), cancel items they will not do that day, remove items from that plan, and change an item's date and target time. A cancelled item stays on that day's timeline with distinct styling; it is not removed from the plan. Changing the date moves the item to that date's day plan (created if missing); the source day plan is removed if it is left empty. Within a day segment, active incomplete items are listed first, then **cancelled** items, then **completed** items; toggling complete or **cancelled** does not change an item's position among items at the same rank. **Cancelled** items use a red-tinted, struck-through treatment so they read as skipped rather than done. Archiving day plan items is not in the first release.
_Code name_: `DayPlanItem` (e.g. table `day_plan_item`). `targetTime` is `HH:mm | null` (nullable for one-off untimed items; always set when snapshotted from a todo).
_Avoid_: DayPlanTodo

**Steps log**:
A **day plan item** that records steps the user has already walked, added via **Add completed steps**. It is a record of something done, not an intention, so it is created complete and the user cannot mark it incomplete. It has no right-click menu, so it cannot be copied to another day or given a **reminder**.
_Avoid_: Steps todo, steps task

**Target time**:
Time-of-day (hour and minute only) for when the user aims to do something. Stored in code as `targetTime`, as an `HH:mm` string with no date. **Todo** and **day plan item** use the same field name (`targetTime`); on create day plan the item value is copied from the todo. On **Todo**, `targetTime` is always set (`HH:mm`, non-nullable)—a todo without a target time is not meant for reuse and cannot be saved in the library. On **day plan item**, `targetTime` is `HH:mm | null` so the user can later add one-off items without a time.
_Avoid_: idealTime, ideal time, defaultCompleteTime, completeTime, complete time, beginTime

**Reminder**:
A message sent to the user at a chosen instant to prompt them about a **day plan item** or an idle **read**. A **day plan item** reminder belongs to that item (not to the todo it may have been copied from). A **read** reminder belongs to that **read** while it is idle. At most one pending reminder per **day plan item** or idle **read**; scheduling again replaces the previous one. A **day plan item** that is marked complete or **cancelled** cannot have a new **reminder** scheduled; marking it complete or **cancelling** it clears any pending reminder. If the user tries to mark complete while a reminder is still pending (the send instant has not passed), the app asks for confirmation; choosing not to complete leaves the item incomplete and the reminder pending; choosing to complete cancels the reminder and marks the item complete.
If the **day plan item** is removed from the plan, any pending reminder for it is cancelled. If the day plan item moves to another **day plan** date, the send instant is recomputed from that new date and the reminder's scheduled time-of-day; if that instant has already passed, the reminder is cleared. The user picks a time-of-day (`HH:mm`); that combines with the **day plan**'s calendar date in the user's local timezone to form the send instant. When setting one, the time defaults to the day plan item's `targetTime`, or is empty when the item has none. Opening **Remind me** again while a reminder is pending defaults the time field to that reminder's scheduled time-of-day (not necessarily the item's **target time**). A reminder cannot be scheduled for an instant that has already passed. After the message is sent, the reminder is no longer pending and the subject no longer shows a scheduled-reminder indicator; the user may schedule again. After scheduling a **day plan item** or **read** reminder, a success confirmation may offer **Undo** to cancel that pending reminder (and clear the indicator); undo is not offered once the send instant has passed.
When a **reminder** is scheduled, the app registers it with Telegram's server-side message schedule for the send instant (no separate send loop in the app). Cancelling or replacing a reminder removes or updates that scheduled message. The app still records pending reminders so the day plan UI can show state (indicator, undo, cancel). Delivery uses a single Telegram **user** account whose session is configured for the deployment (one implicit user). Scheduled messages are delivered to that account's **Saved Messages**.
When a **reminder** is delivered, the user is notified via Telegram: for a **day plan item**, the message uses the item title with that item's **day plan** date and the reminder time-of-day (same style as **target time** on the page); for a **read**, the message uses the **read**'s display label (title when set, otherwise the URL) with the reminder's calendar date and the reminder time-of-day.
For an idle **read**, the user picks a time-of-day (`HH:mm`) and whether the send date is **today** or a later local calendar day. By default the send date is **today**; optional **Not today?** schedules for a day offset from **today** (whole days, at least one when checked; default offset one means tomorrow; no maximum). The send instant is that calendar date plus the chosen time in the user's local timezone. Opening **Remind me** again while a **read** reminder is pending defaults the time, **Not today?**, and offset from that pending schedule (offset is whole days from **today** to the pending send date). A reminder cannot be scheduled for an instant that has already passed. **Mark finished** on a **read** clears any pending **reminder**; if the send instant has not passed yet, the app asks for confirmation first (same pattern as marking a **day plan item** complete with a pending reminder). Editing an idle **read**'s URL or title while a **reminder** is pending updates the scheduled Telegram message to use the new display label without changing the send instant.
On the **day plan** page, right-clicking a **day plan item** opens a menu with **Go to original todo** when the item has a source **todo** link (opens **Todos** with that **todo** selected). **Remind me** (opens the reminder dialog) when the item is not complete, not **cancelled**, and its scheduled slot is still in the future: the **day plan** date must be today or later, and when the item has a **target time**, that date-and-time instant must not have passed yet (items without a **target time** only use the calendar date). When a reminder is already pending, **Cancel reminder** is also shown. On **Later reads**, right-clicking an idle **read** opens **Remind me** (same time picker as the day plan, plus **Not today?** and day offset when checked). When a reminder is already pending, **Cancel reminder** is also shown. **Cancel item** marks an incomplete item **cancelled** for that day (mutually exclusive with **completed**; clears any pending **reminder**). It is not offered for **completed** items. When the item is **cancelled**, **Restore item** returns it to an active incomplete item. The completion control is not used while the item is **cancelled**. **Duplicate item** adds another **day plan item** on the same **day plan** with the same title and **target time**; the copy is incomplete, not **cancelled**, and has no **reminder**.
_Avoid_: Todo reminder, notification (when you mean the reminder itself; the on-row icon is a scheduled-reminder indicator)

**Todo**:
Something the user has defined for reuse across days: a title and a required target time (`HH:mm`, non-nullable in storage and in forms). A todo without a target time is not part of the reusable library. The first release includes full create, read, update, and delete for todos. The create-day-plan dialog lists the user’s todos. Todos are ordered oldest-first (by when they were created) in the library and in that dialog. Deleting a todo does not change day plan items already created from it.
_Code name_: `Todo`. `targetTime`: `TodoTargetTime` (`HH:mm`, required).
_Avoid_: Predefined todo

**Todo group**:
A labeled set of todos you might apply together when building a day plan (for example “Health” or “Evening shutdown”). Not in the first release (sometimes called “todo templates” in planning—those groupings are out of scope; **Todo** is not).
_Avoid_: Todo template (when you mean todo groups)

**Read**:
A saved link the user intends to open and read later: a required URL, an optional title for display, when it was added, and a **read type** of idle or mark-as-resolved. Not a **matter**, **todo**, or **day plan item**. New **reads** are idle. **Mark finished** sets read type to mark-as-resolved and records when it was finished; the row stays in storage, clears any pending **reminder**, and leaves the main idle list. Only idle **reads** can have a **reminder** scheduled. **Archive** is not in the first release.
_Code name_: `Read` (e.g. table `read`). Read type values: `IDLE`, `MARK_AS_RESOLVED`. `createdAt` orders the idle list newest-first (not shown in the UI).
_Avoid_: Later read, reading list item, saved article (when you mean this concept); “read” when you mean the finished action (say **mark finished**); “type” when you mean **read type**

**Create day plan**:
The action that creates a day plan for the selected calendar date. Opens a dialog listing all of the user’s todos, each selected by default; the user unchecks any they do not want, then confirms. At least one todo must remain selected to confirm. Checked todos are snapshotted into day plan items. Todo groups are not used in this flow yet. If the user has no todos, the control is disabled and the UI directs them to add a todo first.

**Day segment**:
A fixed part of the day (morning, noon, afternoon, evening, night) used to group day plan items on the page. Segment boundaries match the bioenergetic reset tracker diary timeline. Items with a target time are placed in the segment that contains that target time; within a segment, items are ordered by target time. Segments with no items are hidden; the list uses the same timeline-style layout as that diary page.
_Code name_: `DaySegment` (e.g. `DaySegmentId`, `lib/day-segments.ts`).
_Avoid_: Diary group

**Anytime**:
The **day segment** for **day plan items** whose `targetTime` is `null`—**Anytime** means a day plan item with no target time, not a separate kind of row. Shown as its own labeled block at the bottom of the day plan timeline (after night), when at least one such item exists.
_Code name_: day segment id `anytime` (see `DaySegmentId` in `lib/day-segments.ts`).
The first release has no UI to create untimed day plan items; items from todos always have a copied `targetTime`, so **Anytime** does not appear in v1.

## App areas

**Todos**:
Top-level navigation area where the user manages the todo library (create, read, update, delete).

**Day plan**:
Top-level navigation area where the user picks a local calendar date and views or creates that day’s plan, completes items, and removes items.

**Later reads**:
Top-level navigation area where the user adds **reads**, edits idle **reads** (URL and optional title), opens each row as a clickable external link, schedules **reminders** (**Remind me**), and marks **reads** finished (read type becomes mark-as-resolved). The main list shows only idle **reads**, ordered newest-first. A row with a pending **reminder** shows a scheduled-reminder indicator. At the bottom, a collapsible **Finished** section lists up to ten most recently finished **reads** (by finish time, or added time when finish time was not recorded); the section title shows the total count of finished **reads**. Finished rows are read-only links with a short relative time since finish.
