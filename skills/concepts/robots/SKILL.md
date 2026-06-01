---
name: robots
description: "Kinetic Robots — scheduled automation. Robot-definitions/executions/next-execution datastore forms, the execution routine, robot tree pattern, creating/scheduling a robot, and gotchas."
---

# Kinetic Robots (Scheduled Automation)

Robots are how a Kinetic space runs work **on a schedule** (the platform has no separate cron). A robot is a datastore record describing a cadence plus the name of a task **tree** to run. Submitting the record triggers a global routine that computes the next run time, waits, invokes the tree, records the result, and reschedules itself.

Use a robot for anything recurring: nightly cleanups, polling an external system, activating/expiring time-bounded records, sending digests.

For tree/handler authoring see `concepts/workflow-xml`; for datastore queries see `concepts/kql-and-indexing`.

---

## The three backing datastore forms

| Form slug | Purpose | Key fields |
|---|---|---|
| `robot-definitions` | One record per robot — the schedule + target tree | `Robot Name`, `Status` (`Active`/`Inactive`), `Task Tree` (tree **name**, not full title), `Recurrence` (`minutely`/`hourly`/`daily`/`weekly`/`monthly`/`yearly`), `Interval`, `Execution Hour`/`Execution Minute` (**UTC**), `Start Date`, `End Date`, `Runtime Inputs` (JSON), and the multi-select scheduling fields below |
| `robot-executions` | One record per run | `Robot ID`, `Robot Name`, `Status` (`Running`→`Completed`), `Start`, `End`, `Run Id`, `Input`, `Output`, `Deferral Token` |
| `robot-next-execution` | The computed next run datetime per robot | `Robot ID`, `Next Execution` (ISO UTC) |

`robot-definitions` also has multi-select fields used for weekly/monthly cadences: `Weekdays`, `Months`, `Days`, and `Sunday Index`…`Saturday Index`. **These must be present as arrays (empty `[]` is fine) even for `hourly`/`daily`** — see Gotchas.

---

## Execution model

`routine_kinetic_robot_execution_v2` is the engine. It is triggered by the `robot-definitions` **Saved** event. On each fire it:

1. Reads the robot definition (recurrence/interval/hour/minute/weekdays/…) and computes the **next** run, writing/updating the `robot-next-execution` record.
2. Defers via `system_wait_v1` until that time.
3. Creates a `robot-executions` record and invokes the target tree **asynchronously**, passing JSON in `@source['Data']` containing `Kinetic Robot Execution Record Id` and `Kinetic Robot Deferral Token`.
4. Reschedules itself (recursively) for the following run — unless `Status` is `Inactive` or past `End Date`.

So you never write a cron expression — you describe the cadence in the record and the routine self-schedules.

---

## The robot tree pattern

A robot's target tree is a normal **Tree** with `sourceName=Kinetic Robot`, `sourceGroup=Robots`, title `Kinetic Robot :: Robots :: <name>`. Clone the shape of an existing one (e.g. `Alternate Approver Process`):

1. **Start** branches on whether it was robot-initiated:
   ```ruby
   # "Robot Initiated"
   if @source['Data']
     JSON.parse(@source['Data']).has_key?('Kinetic Robot Execution Record Id')
   else false end
   ```
   The complementary "Not from Robot" branch lets the tree also run ad-hoc (handy for testing — see below).
2. **Update Robot Execution Status** — `routine_kinetic_datastore_submission_update_v1` sets the `robot-executions` record (`Id` = `<%= JSON.parse(@source['Data'])['Kinetic Robot Execution Record Id'] %>`) to `{"Status":"Running","Run Id":<%= @run['Id'] %>}`.
3. **Robot Return Trigger** — `utilities_create_trigger_v1` with `action_type=Complete` and `deferral_token = <%= JSON.parse(@source['Data'])['Kinetic Robot Deferral Token'] %>`. This completes the deferral so the execution routine marks the run `Completed` and reschedules. Fire it **in parallel** with the actual work (join → one branch returns the trigger, another does the work, both meet at a junction → End).
4. **The work** — retrieve/loop/process. Loops follow the standard `concepts/workflow-xml` rules (loop-tail needs the `number` param; branch bodies reconverge via a `system_junction_v1`). The loop item is available as `@<var_name>`.

---

## Creating a new robot

1. **Author the tree** (title `Kinetic Robot :: Robots :: <name>`, source `Kinetic Robot`, group `Robots`) and push it (`POST /trees?force=true`).
2. **Create the `robot-definitions` record** (datastore submission, `completed=true`). Submitting it auto-schedules via the execution routine. A complete hourly example:
   ```json
   {"values": {
     "Robot Name": "My Robot",
     "Status": "Active",
     "Task Tree": "My Robot",
     "Recurrence": "hourly", "Interval": "1",
     "Recurrence Label": "hourly",
     "Recurrence Description": "Every 1 hour at :15 past the hour",
     "Execution Hour": null, "Execution Minute": "15",
     "Start Date": "2026-01-01T00:00:00+00:00", "End Date": null,
     "Notify Upon Each Run Completion": "No",
     "Timing": null,
     "Months": [], "Weekdays": [], "Days": [],
     "Sunday Index": [], "Monday Index": [], "Tuesday Index": [],
     "Wednesday Index": [], "Thursday Index": [], "Friday Index": [],
     "Saturday Index": []
   }}
   ```
3. **Confirm scheduling:** a `robot-next-execution` record appears for the new `Robot ID` with the correct `Next Execution`. After it fires, a `robot-executions` record shows `Status: Completed`.

To **stop** a robot, set its `robot-definitions` `Status` to `Inactive` (the execution routine stops rescheduling on the next wake). Prefer this over deleting.

---

## Gotchas (verified)

- **Multi-select scheduling fields must be present as arrays.** Omitting `Months`/`Weekdays`/`Days`/`*Index` (leaving them `null`) makes the execution routine's "Determine next execution" node throw `NoMethodError` ("the 'months' parameter could not be evaluated") and **no `robot-next-execution` is created — the robot silently never runs.** Always send them as `[]`. A bare API POST that only sets the obvious fields will hit this; mirror a working record's full field set.
- **A datastore PATCH does not re-trigger scheduling.** The execution routine fires on the **Saved/create** path; updating an existing `robot-definitions` record via PATCH does not recompute `robot-next-execution`. To (re)schedule, **create** a record (or re-submit so the Saved event fires).
- **All times are UTC** (`Execution Hour`/`Execution Minute`, `Next Execution`).
- **`Task Tree` is the tree NAME**, not the `Kinetic Robot :: Robots :: …` title.
- **Testing without waiting for the schedule:** there is no ad-hoc run-tree endpoint (`POST /trees/{title}/run` → 404). Two options: (a) include a "Not from Robot" Start branch so the tree's work runs even when invoked outside the scheduler; or (b) create a temporary `robot-definitions` record whose `Execution Minute` is a few minutes ahead, let it fire once, then set it `Inactive`.
- **Inspect a run:** `robot-executions` (`Status`, `Run Id`) plus the Task runs API (`/runs?originatingId=…&include=tasks`) and `/errors?include=details&status=Active` (see `concepts/workflow-xml`).
