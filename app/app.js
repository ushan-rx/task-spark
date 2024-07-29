
import { get, set, migrate, onChange } from "../common/storage.js";
import * as M from "../common/models.js";
import { taskProgress, computeDashboardMetrics } from "../common/metrics.js";
import {
	mdRender,
	fuzzyContains,
	todayYMD,
	isThisWeek,
	parseYMD,
	isValidUrl,
} from "../common/util.js";
import { setProgress, toast, celebrate } from "../common/ui.js";

const S = { tasks: [], goals: [], daily: [], settings: {} };
let selectedTaskId = null;
let selectedDateFilter = ""; // YYYY-MM-DD or ""

const els = {
	search: document.getElementById("search"),
	filterStatus: document.getElementById("filterStatus"),
	filterPri: document.getElementById("filterPri"),
	toggleCal: document.getElementById("toggleCal"),
	newTask: document.getElementById("newTask"),
	newGoal: document.getElementById("newGoal"),
	calendarWrap: document.getElementById("calendarWrap"),
	week: document.getElementById("week"),
	month: document.getElementById("month"),
	taskList: document.getElementById("taskList"),
	goalList: document.getElementById("goalList"),
	detail: document.getElementById("detail"),
	kpiToday: document.getElementById("kpiToday"),
	kpiWeek: document.getElementById("kpiWeek"),
	kpiStreak: document.getElementById("kpiStreak"),
	kpiFocus: document.getElementById("kpiFocus"),
};

async function init() {
	await migrate();
	Object.assign(S, await getAll());
	// default: goals visible and detail hidden
	renderAll();
}

async function getAll() {
	const { tasks, goals, daily, settings } = await getAllRaw();
	return { tasks, goals, daily, settings };
}
async function getAllRaw() {
	return await chrome.storage.local
		.get(null)
		.then(async () => (await import("../common/storage.js")).getAll());
}

onChange((patch) => {
	setStatePatch(patch);
	renderAll();
});

function renderAll() {
	renderKPIs();
	renderTasks();
	renderDetail();
}

function renderKPIs() {
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

	// overall streaks (for compatibility)
	chrome.runtime
		.sendMessage({ type: "getStreaks" })
		.then(({ current, longest }) => {
			// Per-task daily streaks list
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

// badge under a task to show its status
function statusBadge(t) {
	const el = document.createElement("span");
	el.className = "badge";
	const now = new Date();
	const due = t.dueDate ? new Date(t.dueDate + "T23:59:59") : null;
	// risk = whether less than two days left to complete the task
	const risk = due && due - now < 2 * 24 * 3600 * 1000;
	if (t.status === "done") el.classList.add("ok"), (el.textContent = "done");
	else if (due && due < now)
		el.classList.add("overdue"), (el.textContent = "overdue");
	else if (risk) el.classList.add("risk"), (el.textContent = "at risk");
	else el.classList.add("ok"), (el.textContent = "on track");
	return el;
}

function renderTasks() {
	const q = els.search.value.trim();
	const st = els.filterStatus.value;
	const pr = els.filterPri.value;
	let arr = S.tasks.slice();

	arr = arr.filter(
		(t) =>
			(!st || t.status === st) &&
			(!pr || t.priority === pr) &&
			(!selectedDateFilter || t.dueDate === selectedDateFilter) &&
			fuzzyContains(t.title + " " + t.description, q)
	);

	els.taskList.innerHTML = "";
	if (!arr.length) {
		els.taskList.innerHTML = `<div class="empty">No tasks match.</div>`;
		return;
	}

	arr.forEach((t) => {
		const row = document.createElement("div");
		row.className = "item";
		row.dataset.id = t.id;

		const handle = document.createElement("div");
		handle.className = "handle";
		handle.textContent = "⋮⋮";

		const expand = document.createElement("button");
		expand.className = "expand";
		expand.setAttribute("aria-label", "Toggle subtasks");
		let open = false;
		expand.textContent = "▸";
		expand.addEventListener("click", () => {
			open = !open;
			expand.textContent = open ? "▾" : "▸";
			subsBox.classList.toggle("hide", !open);
		});

		const mid = document.createElement("div");
		const title = document.createElement("div");
		title.className = "title";
		title.textContent = t.title;
		title.contentEditable = "true";
		title.spellcheck = false;
		title.addEventListener("keydown", async (e) => {
			if ((e.ctrlKey && e.key === "Enter") || e.key === "Enter") {
				e.preventDefault();
				await M.updateTask(t.id, { title: title.textContent.trim() });
				toast("Saved");
			}
		});
		const meta = document.createElement("div");
		meta.className = "meta";
		meta.append(
			statusBadge(t),
			...(t.tags || []).map((tag) => {
				const b = document.createElement("span");
				b.className = "badge";
				b.textContent = "#" + tag;
				return b;
			})
		);
		const prog = document.createElement("div");
		prog.className = "progress";
		const bar = document.createElement("div");
		bar.className = "bar";
		prog.append(bar);
		mid.append(title, meta, prog);

		const right = document.createElement("div");
		right.className = "right";
		const chk = document.createElement("button");
		chk.className = "small done";
		chk.title = "Mark complete";
		chk.textContent = "✓";
		chk.addEventListener("click", async () => {
			await M.updateTask(t.id, {
				status: "done",
				updatedAt: new Date().toISOString(),
			});
			if (t.subtasks?.length) await M.setAllSubtasksDone(t.id);
			if (t.isDaily || t.repeat === "daily")
				await M.markDailyCompletion(t.id);
			celebrate(row);
			renderAll();
		});
		const del = document.createElement("button");
		del.className = "small del";
		del.title = "Delete task";
		del.textContent = "🗑";
		del.addEventListener("click", async () => {
			if (window.confirm("Delete this task?")) {
				await M.deleteTask(t.id);
				if (selectedTaskId === t.id) selectedTaskId = null;
				renderAll();
			}
		});
		right.append(chk, del);

		const subsBox = document.createElement("div");
		subsBox.className = "subs hide";
		(t.subtasks || []).forEach((s) => {
			const r = document.createElement("div");
			r.className = "sub-row";
			const cb = document.createElement("input");
			cb.type = "checkbox";
			cb.checked = !!s.done;
			cb.addEventListener("change", async () => {
				await M.toggleSubtask(t.id, s.id, cb.checked);
				renderAll();
			});
			const name = document.createElement("input");
			name.type = "text";
			name.value = s.title;
			name.title = "Edit subtask name";
			name.addEventListener("change", async () => {
				await M.renameSubtask(t.id, s.id, name.value);
				toast("Updated");
			});
			const sd = document.createElement("button");
			sd.className = "small del";
			sd.textContent = "✖";
			sd.title = "Delete subtask";
			sd.addEventListener("click", async () => {
				if (window.confirm("Delete this subtask?")) {
					await M.deleteSubtask(t.id, s.id);
					renderAll();
				}
			});
			r.append(cb, name, sd);
			subsBox.appendChild(r);
		});

		row.append(handle, expand, mid, right);
		row.append(subsBox);

		row.addEventListener("click", (e) => {
			const ignore = [chk, del, expand];
			if (ignore.includes(e.target)) return;
			if (e.target.closest(".sub-row")) return;
			if (e.target !== title) {
				selectedTaskId = t.id;
				renderDetail();
			}
		});

		els.taskList.appendChild(row);
		setProgress(bar, taskProgress(t));

		// Drag to reorder (pointer events)
		handle.addEventListener("pointerdown", startDrag);
	});

	function startDrag(e) {
		const src = e.target.closest(".item");
		src.classList.add("dragging");
		const onMove = (ev) => {
			const y = ev.clientY;
			for (const row of els.taskList.querySelectorAll(".item")) {
				if (row === src) continue;
				const r = row.getBoundingClientRect();
				if (y < r.top + r.height / 2) {
					els.taskList.insertBefore(src, row);
					break;
				}
			}
		};
		const onUp = async () => {
			src.classList.remove("dragging");
			window.removeEventListener("pointermove", onMove);
			window.removeEventListener("pointerup", onUp);
			const ids = [...els.taskList.querySelectorAll(".item")].map(
				(x) => x.dataset.id
			);
			await M.reorderTasks(ids);
			toast("Reordered");
		};
		window.addEventListener("pointermove", onMove);
		window.addEventListener("pointerup", onUp);
	}
}

function renderDetail() {
	const box = els.detail;
	box.innerHTML = "";
	const t = S.tasks.find((x) => x.id === selectedTaskId);
	if (!t) {
		box.innerHTML = `<div class="empty">Select a task or goal</div>`;
		return;
	}
	const wrap = document.createElement("div");
	wrap.innerHTML = `
    <h3 contenteditable="true" spellcheck="false">${t.title}</h3>
    <div class="meta">Status: ${t.status}</div>
    <div class="progress"><div class="bar" id="detailBar" role="progressbar" aria-valuemin="0" aria-valuemax="100"></div></div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:8px 0;">
      <label>Due date <input type="date" id="dueDate" value="${
			t.dueDate || ""
		}"></label>
      <label>Time <input type="time" id="time" value="${t.time || ""}"></label>
      <label>Priority
        <select id="prio">
          <option value="high" ${
				t.priority === "high" ? "selected" : ""
			}>High</option>
          <option value="med" ${
				t.priority === "med" ? "selected" : ""
			}>Medium</option>
          <option value="low" ${
				t.priority === "low" ? "selected" : ""
			}>Low</option>
        </select>
      </label>
      <label>Repeat
        <select id="repeat">
          <option value="once" ${
				t.repeat === "once" ? "selected" : ""
			}>One time</option>
          <option value="daily" ${
				t.repeat === "daily" ? "selected" : ""
			}>Daily</option>
          <option value="weekly" ${
				t.repeat === "weekly" ? "selected" : ""
			}>Weekly</option>
        </select>
      </label>
      <label style="grid-column:1/-1;">Assign to goal
        <select id="goalSel">
          <option value="">— None —</option>
          ${S.goals
				.map(
					(g) =>
						`<option value="${g.id}" ${
							t.goalId === g.id ? "selected" : ""
						}>${g.title}</option>`
				)
				.join("")}
        </select>
      </label>
    </div>

    <h4>Description</h4>
    <div id="desc" class="desc" contenteditable="true" spellcheck="false"></div>

    <h4>Links</h4>
    <div id="links"></div>
    <div style="display:flex;gap:6px;margin-top:6px;">
      <input id="linkLabel" placeholder="Label" />
      <input id="linkUrl" placeholder="https://example.com" />
      <button id="addLink" class="btn">Add link</button>
    </div>

    <h4>Subtasks</h4>
    <div id="subs"></div>

    <div class="actions" style="margin-top:10px; display:flex; gap:6px;">
      <button id="save" class="btn primary">Save (Ctrl+Enter)</button>
      <button id="del" class="btn secondary">Delete</button>
    </div>
  `;
	box.appendChild(wrap);
	wrap.querySelector("#desc").innerHTML = mdRender(t.description);
	setProgress(wrap.querySelector("#detailBar"), taskProgress(t));

	const dueEl = wrap.querySelector("#dueDate");
	const timeEl = wrap.querySelector("#time");
	const prioEl = wrap.querySelector("#prio");
	const repEl = wrap.querySelector("#repeat");
	const goalSel = wrap.querySelector("#goalSel");

	// Editable handlers
	const titleEl = wrap.querySelector("h3");
	const descEl = wrap.querySelector("#desc");
	const saveFn = async () => {
		await M.updateTask(t.id, {
			title: titleEl.textContent.trim(),
			description: descEl.textContent
				.replace(/<br>/g, "\n")
				.replace(/<[^>]+>/g, ""),
			dueDate: dueEl.value,
			time: timeEl.value,
			priority: prioEl.value,
			repeat: repEl.value,
		});
		// goal assignment
		if (goalSel.value) await M.linkTaskToGoal(t.id, goalSel.value);
		else await M.unlinkTaskFromGoals(t.id);

		toast("Saved");
		renderAll();
	};
	wrap.querySelector("#save").addEventListener("click", saveFn);
	document.addEventListener(
		"keydown",
		(e) => {
			if (e.ctrlKey && e.key === "Enter") saveFn();
		},
		{ once: true }
	);

	// Subtasks
	const subs = wrap.querySelector("#subs");
	subs.innerHTML = "";
	for (const s of t.subtasks) {
		const row = document.createElement("div");
		row.className = "sub-row";
		const ck = document.createElement("input");
		ck.type = "checkbox";
		ck.checked = s.done;
		ck.addEventListener("change", async () => {
			await M.toggleSubtask(t.id, s.id, ck.checked);
			renderAll();
		});
		const input = document.createElement("input");
		input.type = "text";
		input.value = s.title;
		input.addEventListener("change", async () => {
			await M.renameSubtask(t.id, s.id, input.value);
			toast("Updated");
		});
		const del = document.createElement("button");
		del.className = "small del";
		del.textContent = "✖";
		del.addEventListener("click", async () => {
			if (window.confirm("Delete this subtask?")) {
				await M.deleteSubtask(t.id, s.id);
				renderAll();
			}
		});
		row.append(ck, input, del);
		subs.appendChild(row);
	}
	const add = document.createElement("button");
	add.textContent = "+ Subtask";
	add.addEventListener("click", async () => {
		await M.createSubtask(t.id, "New subtask");
		renderAll();
	});
	subs.appendChild(add);

	// Links
	const links = wrap.querySelector("#links");
	const renderLinks = () => {
		links.innerHTML =
			(t.urls || [])
				.map((u, idx) => {
					const safeLabel = u.label || u.url;
					return `<div data-i="${idx}"><a href="${u.url}" target="_blank" rel="noopener">${safeLabel}</a> <button class="small del" data-del="${idx}">🗑</button></div>`;
				})
				.join("") || `<div class="meta">No links</div>`;
		[...links.querySelectorAll("[data-del]")].forEach((btn) => {
			btn.addEventListener("click", async () => {
				const idx = +btn.dataset.del;
				const nu = (t.urls || []).slice();
				nu.splice(idx, 1);
				await M.updateTask(t.id, { urls: nu });
				t.urls = nu;
				renderLinks();
				toast("Link removed");
			});
		});
	};
	renderLinks();

	wrap.querySelector("#addLink").addEventListener("click", async () => {
		const label = wrap.querySelector("#linkLabel").value.trim();
		const url = wrap.querySelector("#linkUrl").value.trim();
		if (!isValidUrl(url)) {
			alert("Enter a valid http(s) URL.");
			return;
		}
		const nu = (t.urls || []).concat([{ label, url }]);
		await M.updateTask(t.id, { urls: nu });
		t.urls = nu;
		renderLinks();
		wrap.querySelector("#linkLabel").value = "";
		wrap.querySelector("#linkUrl").value = "";
	});

	// Delete task (confirm)
	wrap.querySelector("#del").addEventListener("click", async () => {
		if (window.confirm("Delete this task?")) {
			await M.deleteTask(t.id);
			selectedTaskId = null;
			renderAll();
		}
	});
}

// Events & shortcuts
els.newTask.addEventListener("click", async () => {
	const t = await M.createTask({ title: "New task", priority: "med" }); // default med
	selectedTaskId = t.id;
	renderAll();
});

els.toggleCal.addEventListener("click", () => {
	els.calendarWrap.classList.toggle("hide");
	renderCalendar();
});

els.search.addEventListener("input", renderTasks);
els.filterStatus.addEventListener("change", renderTasks);
els.filterPri.addEventListener("change", renderTasks);

init();
