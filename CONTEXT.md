# Life management

Planning and tracking daily intentions and longer-running personal affairs. The first release assumes a single implicit user per deployment (no login, no per-row user identity).

## Language

**Matter**:
A longer-running affair tracked outside the day-plan flow (documents, attachments, categories). Unrelated to day plans in the first release; the matter feature is unchanged until a later design links them.

**Day plan**:
A dated plan for what to do on a specific calendar day, made up of day plan items. The date is the user’s local calendar date (same convention as the bioenergetic diary URL). A day plan may be created for any date the user can select (past, today, or future). At most one day plan per calendar date. If none exists for the selected date, the day plan page shows a control to create one (no plan row until the user does). If every day plan item is removed, the day plan is removed as well and the **Create day plan** control returns.
_Avoid_: Diary

**Day plan item**:
One entry on a day plan: title, optional target time, and whether it is completed for that day. The completion flag is stored in code as `completed`. Values are copied from todos when the item is created; later todo edits do not change existing day plan items. On an existing day plan, the user can mark items complete or incomplete and remove items from that plan. Completed items stay in place within their day segment (order does not change when toggling complete). Archiving day plan items is not in the first release.
_Code name_: `DayPlanItem` (e.g. table `day_plan_item`). `targetTime` is `HH:mm | null` (nullable for one-off untimed items; always set when snapshotted from a todo).
_Avoid_: DayPlanTodo

**Target time**:
Time-of-day (hour and minute only) for when the user aims to do something. Stored in code as `targetTime`, as an `HH:mm` string with no date. **Todo** and **day plan item** use the same field name (`targetTime`); on create day plan the item value is copied from the todo. On **Todo**, `targetTime` is always set (`HH:mm`, non-nullable)—a todo without a target time is not meant for reuse and cannot be saved in the library. On **day plan item**, `targetTime` is `HH:mm | null` so the user can later add one-off items without a time.
_Avoid_: idealTime, ideal time, defaultCompleteTime, completeTime, complete time, beginTime

**Todo**:
Something the user has defined for reuse across days: a title and a required target time (`HH:mm`, non-nullable in storage and in forms). A todo without a target time is not part of the reusable library. The first release includes full create, read, update, and delete for todos. The create-day-plan dialog lists the user’s todos. Todos are ordered oldest-first (by when they were created) in the library and in that dialog. Deleting a todo does not change day plan items already created from it.
_Code name_: `Todo`. `targetTime`: `TodoTargetTime` (`HH:mm`, required).
_Avoid_: Predefined todo

**Todo group**:
A labeled set of todos you might apply together when building a day plan (for example “Health” or “Evening shutdown”). Not in the first release (sometimes called “todo templates” in planning—those groupings are out of scope; **Todo** is not).
_Avoid_: Todo template (when you mean todo groups)

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
