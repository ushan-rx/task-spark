import { S, els } from "../store.js";
import { setProgress } from "../ui.js";
import { computeDashboardMetrics } from "../metrics.js";
import { todayYMD, parseYMD } from "../util.js";

export function renderKPIs() {
	const ymd = todayYMD();
	const todayTasks = S.tasks.filter((t) => t.dueDate === ymd);
	const completion = todayTasks.length
		? Math.round(
				(100 * todayTasks.filter((t) => t.status === "done").length) /
					todayTasks.length
		  )
		: 0;
	els.kpiToday.innerHTML = `<div>Today</div><div class="big">${completion}%</div><div class="progress"><div class="bar" id="barToday"></div></div>`;
	setProgress(els.kpiToday.querySelector("#barToday"), completion / 100);

	const metrics = computeDashboardMetrics(S.tasks, S.daily, S.settings);
	els.kpiWeek.innerHTML = `<div>This week</div><div class="big">${Math.round(
		100 * metrics.weeklyCompletion
	)}%</div><div class="meta">On-time: ${Math.round(
		100 * metrics.onTimeRate
	)}%</div>`;

	chrome.runtime
		.sendMessage({ type: "getStreaks" })
		.then(({ current, longest }) => {
			const dailyTasks = S.tasks.filter(
				(t) => t.repeat === "daily" || t.isDaily
			);
			const list =
				dailyTasks
					.map((t) => {
						const days = dailyStreakForTask(t.id, S.daily);
						return `<div>${t.title} — ${days} day${
							days === 1 ? "" : "s"
						}</div>`;
					})
					.join("") || `<div class="meta">No daily tasks yet</div>`;
			els.kpiStreak.innerHTML = `<div>Streak</div><div class="big">${current}🔥</div><div class="meta">Best ${longest}</div>${list}`;
		});

	els.kpiFocus.innerHTML = `<div>Focus score</div><div class="big">${Math.round(
		100 * metrics.focusScore
	)}/100</div>`;
}

function dailyStreakForTask(taskId, dailyRecords) {
	const set = new Set(
		dailyRecords
			.filter((r) => r.completedTaskIds?.includes(taskId))
			.map((r) => r.date)
	);
	const today = todayYMD();
	let cur = 0;
	let cursor = parseYMD(today);
	while (set.has(todayYMD(cursor))) {
		cur++;
		cursor.setDate(cursor.getDate() - 1);
	}
	return cur;
}
