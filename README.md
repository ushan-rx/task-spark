# TaskSpark (Chrome Extension, MV3)

**TaskSpark** is a minimal, elegant, **local-only** task manager. It runs entirely offline with **HTML/CSS/vanilla JS** and stores data in `chrome.storage.local`. No servers. No external requests.

## Highlights
- **Tasks**: title, description (markdown-lite), due date & time, priority, tags, links, status.
- **Subtasks**: expand/collapse in list, rename/delete inline, progress auto-computed.
- **Quick Add**: press **Enter** to add (default priority = medium).
- **Repeat**: once / daily / weekly; daily tasks contribute to **streaks**.
- **Goals**: link tasks; progress is priority-weighted; donut meter; editable; deletable.
- **Dashboard**: Today/Week KPIs, streaks list, focus score.
- **Calendar**: month & week strip (no libraries); click to filter.
- **Accessibility**: semantic HTML, ARIA live updates; animations respect `prefers-reduced-motion`.
- **Views**: Popup (quick actions) + **Full Page** app at `app/app.html`.

## Install (Load Unpacked)
1. Save the folder as `taskspark/`.
2. Go to `chrome://extensions`, enable **Developer mode**.
3. Click **Load unpacked** → select the `taskspark` folder.
4. Optional: open the full app via the popup button or navigate to `app/app.html`.

## Usage Tips
- Click a task to open **Details** (right pane). Use **← Back** to return to Goals.
- Add/rename/delete **subtasks** in the list or details.
- Add **links** to a task (validated http/https).
- Assign a task to a **Goal**; progress updates automatically.
- **Streaks**: per-daily-task list + overall current/longest.
- **Options** page: theme, notifications (optional), week start, **export/import JSON**, seed demo data.

## Keyboard Shortcuts
- altkey +
- `/` focus search • `N` new task • `G` new goal • `D` toggle calendar • **Ctrl+Enter** save edits

## Permissions & CSP
- `storage`, `alarms`, `notifications` (opt-in).
- Strict CSP; no remote code, no eval, no network calls.

## Data
- Stored under namespaced keys in `chrome.storage.local` (no Sync).
- Backup/restore via Options → Export/Import JSON.

