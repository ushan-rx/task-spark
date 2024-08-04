import { get } from "../common/storage.js";
import { listTasks, updateTask } from "../common/models.js";
import { taskProgress } from "../common/metrics.js";
import { todayYMD } from "../common/util.js";
import { setProgress } from "../common/ui.js";

const els = {
	quick: document.getElementById("quickTitle"),
	add: document.getElementById("addBtn"),
	list: document.getElementById("todayList"),
	empty: document.getElementById("empty"),
	streak: document.getElementById("streak"),
	openPanel: document.getElementById("openPanel"),
};

async function render() {
	const [tasks, daily] = await Promise.all([listTasks(), get("daily")]);
	const ymd = todayYMD();
	const due = tasks.filter(
		(t) =>
			t.dueDate === ymd ||
			(t.dueDate && new Date(t.dueDate) < new Date(ymd))
	);
	els.list.innerHTML = "";
	if (!due.length) els.empty.style.display = "block";
	else els.empty.style.display = "none";

	due.sort(
		(a, b) =>
			(a.status === "done") - (b.status === "done") ||
			(a.priority > b.priority ? -1 : 1)
	);
	for (const t of due) {
		const card = document.createElement("div");
		card.className = "card";
		const left = document.createElement("div");
		const title = document.createElement("div");
		title.className = "title";
		title.textContent = t.title;
		const meta = document.createElement("div");
		meta.className = "meta";
		const badge = document.createElement("span");
		badge.className = "badge";
		if (t.status === "done") {
			badge.classList.add("ok");
			badge.textContent = "done";
		} else if (t.dueDate && new Date(t.dueDate) < new Date(ymd)) {
			badge.classList.add("overdue");
			badge.textContent = "overdue";
		} else {
			badge.classList.add("risk");
			badge.textContent = "today";
		}
		meta.append(badge);
		const prog = document.createElement("div");
		prog.className = "progress";
		const bar = document.createElement("div");
		bar.className = "bar";
		bar.setAttribute("role", "progressbar");
		bar.setAttribute("aria-valuemin", "0");
		bar.setAttribute("aria-valuemax", "100");
		prog.append(bar);
		left.append(title, meta, prog);

		const actions = document.createElement("div");
		const ck = document.createElement("input");
		ck.type = "checkbox";
		ck.checked = t.status === "done";
		ck.addEventListener("change", async () => {
			await updateTask(t.id, {
				status: ck.checked ? "done" : "todo",
				updatedAt: new Date().toISOString(),
			});
			render();
		});
		actions.append(ck);

		card.append(left, actions);
		els.list.appendChild(card);

		setProgress(bar, taskProgress(t));
	}

	// Streak
	const streaks = await chrome.runtime.sendMessage({ type: "getStreaks" });
	els.streak.textContent = `Streak: ${streaks.current} 🔥  • Best: ${streaks.longest}`;
}

els.quick.addEventListener("keydown", (e) => {
	if (e.key === "Enter") addQuick();
});
els.add.addEventListener("click", addQuick);
async function addQuick() {
	const t = els.quick.value.trim();
	if (!t) return;
	const { createTask } = await import("../common/models.js");
	await createTask({ title: t, dueDate: todayYMD(), priority: "med" });
	els.quick.value = "";
	render();
}

// Open full-page app in a new tab
els.openPanel.addEventListener("click", () => {
	const url = chrome.runtime.getURL("app/app.html");
	// window.open works without extra permissions
	window.open(url, "_blank");
});

document.addEventListener("keydown", (e) => {
	if (e.key.toLowerCase() === "n") els.quick.focus();
});

render();
