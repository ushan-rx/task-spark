// MV3 service worker (module). Schedules midnight alarm, handles streak compute, optional overdue notifications.
import { get, set } from "../common/storage.js";
import { nextLocalMidnight, todayYMD, parseYMD } from "../common/util.js";

// Schedule daily alarm at local midnight
async function scheduleMidnight() {
	const when = nextLocalMidnight().getTime();
	await chrome.alarms.create("midnightRoll", {
		when,
		periodInMinutes: 24 * 60,
	});
}
chrome.runtime.onInstalled.addListener(async () => {
	await scheduleMidnight();
});
chrome.runtime.onStartup.addListener(async () => {
	await scheduleMidnight();
});

// Handle alarm rollover
chrome.alarms.onAlarm.addListener(async (alarm) => {
	if (alarm.name !== "midnightRoll") return;
	await rollover();
});

async function rollover() {
	//  just compute streak continuity.
	const daily = await get("daily");
	// Ensure an empty record exists for the new day so UI shows 0 until first completion.
	const today = todayYMD();
	if (!daily.find((x) => x.date === today)) {
		daily.push({
			date: today,
			completedTaskIds: [],
			createdAt: new Date().toISOString(),
		});
		await set("daily", daily);
	}
	// fire notifications for overdue tasks if enabled
	const settings = await get("settings");
	if (settings.notifications) {
		const tasks = await get("tasks");
		const overdue = tasks
			.filter(
				(t) =>
					t.dueDate &&
					new Date(t.dueDate) < new Date(today) &&
					t.status !== "done"
			)
			.slice(0, 5);
		if (overdue.length && chrome.notifications) {
			chrome.notifications.create({
				type: "basic",
				iconUrl: "../assets/icon48.png",
				title: "TaskSpark — overdue reminder",
				message: `${overdue.length} task(s) are overdue. Open TaskSpark to prioritize.`,
				priority: 1,
			});
		}
	}
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
	(async () => {
		if (msg.type === "getStreaks") {
			const daily = await get("daily");
			// Compute streaks here (duplicate logic avoided to keep popup light)
			const setDates = new Set(
				daily
					.filter((r) => r.completedTaskIds?.length)
					.map((r) => r.date)
			);
			const today = todayYMD();
			let cur = 0;
			let cursor = parseYMD(today);
			while (setDates.has(todayYMD(cursor))) {
				cur++;
				cursor.setDate(cursor.getDate() - 1);
			}
			// longest
			const sorted = [...setDates].sort();
			let max = 0,
				run = 0,
				prev = null;
			for (const d of sorted) {
				if (!prev) run = 1;
				else
					run =
						(parseYMD(d) - parseYMD(prev)) / (24 * 3600 * 1000) ===
						1
							? run + 1
							: 1;
				if (run > max) max = run;
				prev = d;
			}
			sendResponse({ current: cur, longest: Math.max(max, cur) });
		}
	})();
	return true;
});
