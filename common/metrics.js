// Metrics: task progress, goal progress (priority-weighted), streaks, focus score.
import { PRIORITY_WEIGHT, todayYMD, parseYMD, isThisWeek } from "./util.js";

export function taskProgress(task) {
	const total = task.subtasks?.length || 0;
	if (total === 0) return task.status === "done" ? 1 : 0;
	const done = task.subtasks.filter((s) => s.done).length;
	return done / total;
}

export function goalProgress(goal, allTasks) {
	const tasks = goal.taskIds
		.map((id) => allTasks.find((t) => t.id === id))
		.filter(Boolean);
	if (!tasks.length) return 0;
	let wsum = 0,
		wtot = 0;
	for (const t of tasks) {
		const w = PRIORITY_WEIGHT[t.priority] || 1;
		wsum += taskProgress(t) * w;
		wtot += w;
	}
	return wtot ? wsum / wtot : 0;
}

// Streaks: consecutive days with >=1 completed daily task
export function computeStreaks(dailyRecords) {
	const set = new Set(dailyRecords.filter(Boolean).map((r) => r.date));
	const today = todayYMD();
	// Count backwards from today
	let cur = 0,
		max = 0;
	// Build a sorted list for max scan
	const dates = [...set].sort();
	// Longest streak: scan all
	let run = 0,
		prev = null;
	for (const d of dates) {
		if (!prev) {
			run = 1;
		} else {
			const diff = (parseYMD(d) - parseYMD(prev)) / (24 * 3600 * 1000);
			run = diff === 1 ? run + 1 : 1;
		}
		if (run > max) max = run;
		prev = d;
	}
	// Current streak
	let cursor = parseYMD(today);
	while (set.has(todayYMD(cursor))) {
		cur++;
		cursor.setDate(cursor.getDate() - 1);
	}
	return { current: cur, longest: Math.max(max, cur) };
}

// Focus score = 0.5*onTimeRate + 0.3*weeklyCompletion + 0.2*activeDaysNorm
// - onTimeRate: fraction of tasks completed on/before due date among those due this week.
// - weeklyCompletion: completed / (added this week + carried over due this week).
// - activeDaysNorm: active days this week / 7.
export function computeDashboardMetrics(allTasks, dailyRecords, settings) {
	const weekTasks = allTasks.filter(
		(t) => t.dueDate && isThisWeek(t.dueDate, settings.weekStartMonday)
	);
	const dueAndDone = weekTasks.filter((t) => t.status === "done");
	const onTime = dueAndDone.filter(
		(t) =>
			t.dueDate &&
			t.updatedAt &&
			new Date(t.updatedAt) <= parseYMD(t.dueDate)
	).length;
	const onTimeRate = weekTasks.length ? onTime / weekTasks.length : 0;

	const addedThisWeek = allTasks.filter((t) =>
		isThisWeek(t.createdAt.slice(0, 10), settings.weekStartMonday)
	).length;
	const completedThisWeek = allTasks.filter(
		(t) =>
			t.status === "done" &&
			isThisWeek(t.updatedAt.slice(0, 10), settings.weekStartMonday)
	).length;
	const weeklyCompletion = addedThisWeek
		? completedThisWeek / addedThisWeek
		: 0;

	const activeDays = new Set(
		dailyRecords
			.filter((r) => r.completedTaskIds?.length)
			.map((r) => r.date)
	);
	const activeDaysNorm = Math.min(1, activeDays.size / 7);

	const focusScore = +(
		0.5 * onTimeRate +
		0.3 * weeklyCompletion +
		0.2 * activeDaysNorm
	).toFixed(2);
	return {
		onTimeRate,
		weeklyCompletion,
		activeDays: activeDays.size,
		activeDaysNorm,
		focusScore,
	};
}
