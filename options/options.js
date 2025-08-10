import { get, set, setPatch } from "../common/storage.js";
import * as Models from "../common/models.js";

const el = (id) => document.getElementById(id);

async function load() {
	const { settings } = await chrome.storage.local
		.get(null)
		.then(async () => (await import("../common/storage.js")).getAll());
	el("theme").value = settings.theme || "system";
	el("weekStart").checked = !!settings.weekStartMonday;
	el("notifs").checked = !!settings.notifications;
}

el("theme").addEventListener("change", async () => {
	const settings = await (
		await import("../common/storage.js")
	).get("settings");
	settings.theme = el("theme").value;
	await (await import("../common/storage.js")).set("settings", settings);
});

el("weekStart").addEventListener("change", async () => {
	const settings = await (
		await import("../common/storage.js")
	).get("settings");
	settings.weekStartMonday = el("weekStart").checked;
	await (await import("../common/storage.js")).set("settings", settings);
});

el("notifs").addEventListener("change", async () => {
	const settings = await (
		await import("../common/storage.js")
	).get("settings");
	settings.notifications = el("notifs").checked;
	await (await import("../common/storage.js")).set("settings", settings);
	if (settings.notifications) {
		const ok = await chrome.permissions
			?.request?.({ permissions: ["notifications"] })
			.catch(() => false);
		if (!ok) el("notifs").checked = false;
	}
});

// Export
el("exportBtn").addEventListener("click", async () => {
	const data = await (await import("../common/storage.js")).getAll();
	const blob = new Blob([JSON.stringify(data, null, 2)], {
		type: "application/json",
	});
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = "taskspark-backup.json";
	a.click();
	URL.revokeObjectURL(url);
});

// Import
el("importFile").addEventListener("change", async (ev) => {
	const file = ev.target.files[0];
	if (!file) return;
	const text = await file.text();
	try {
		const json = JSON.parse(text);
		const keys = ["tasks", "goals", "daily", "settings", "schemaVersion"];
		const patch = {};
		for (const k of keys) if (json[k] != null) patch[k] = json[k];
		await (await import("../common/storage.js")).setPatch(patch);
		alert("Imported!");
	} catch {
		alert("Invalid JSON");
	}
});

// Seed dataset
el("seed").addEventListener("click", async () => {
	const now = new Date();
	const today = now.toISOString().slice(0, 10);
	const plus = (d) => {
		const n = new Date(now);
		n.setDate(now.getDate() + d);
		return n.toISOString().slice(0, 10);
	};

	const t1 = await Models.createTask({
		title: "Finish assignment draft",
		description:
			"**Focus:** write introduction and outline.\nAdd references.",
		dueDate: plus(1),
		priority: "high",
		tags: ["uni", "writing"],
		subtasks: [
			{ id: "s1", title: "Outline", done: true },
			{ id: "s2", title: "Intro", done: false },
		],
	});
	const t2 = await Models.createTask({
		title: "Gym — push day",
		description: "Daily routine. Track sets.",
		dueDate: today,
		isDaily: true,
		priority: "med",
		tags: ["health"],
	});
	const t3 = await Models.createTask({
		title: "Read 30 pages",
		description: "Book: *Deep Work*.",
		dueDate: plus(2),
		priority: "low",
		tags: ["reading"],
	});
	const g = await Models.createGoal({
		title: "Ship side project MVP",
		targetDate: plus(14),
		description: "Cut scope, deliver value.",
	});
	await Models.linkTaskToGoal(t1.id, g.id);

	const settings = await (
		await import("../common/storage.js")
	).get("settings");
	settings.seeded = true;
	await (await import("../common/storage.js")).set("settings", settings);
	alert("Seeded sample tasks & goal!");
});

load();
