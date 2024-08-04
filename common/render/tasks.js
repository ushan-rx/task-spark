import * as M from "../models.js";
import { S, els, getSelectedDateFilter, setSelectedTaskId } from "../store.js";
import { fuzzyContains } from "../util.js";
import { setProgress, toast, celebrate } from "../ui.js";
import { taskProgress } from "../metrics.js";
import { renderDetail } from "./detail.js";

function statusBadge(t) {
	const el = document.createElement("span");
	el.className = "badge";
	const now = new Date();
	const due = t.dueDate ? new Date(t.dueDate + "T23:59:59") : null;
	const risk = due && due - now < 2 * 24 * 3600 * 1000;
	if (t.status === "done") el.classList.add("ok"), (el.textContent = "done");
	else if (due && due < now)
		el.classList.add("overdue"), (el.textContent = "overdue");
	else if (risk) el.classList.add("risk"), (el.textContent = "at risk");
	else el.classList.add("ok"), (el.textContent = "on track");
	return el;
}

export function renderTasks() {
	const q = els.search.value.trim();
	const st = els.filterStatus.value;
	const pr = els.filterPri.value;
	let arr = S.tasks.slice();

	arr = arr.filter(
		(t) =>
			(!st || t.status === st) &&
			(!pr || t.priority === pr) &&
			(!getSelectedDateFilter() ||
				t.dueDate === getSelectedDateFilter()) &&
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
		const subsBox = document.createElement("div");
		subsBox.className = "subs hide";
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
			renderTasks();
			renderDetail();
		});
		const del = document.createElement("button");
		del.className = "small del";
		del.title = "Delete task";
		del.textContent = "🗑";
		del.addEventListener("click", async () => {
			if (window.confirm("Delete this task?")) {
				await M.deleteTask(t.id);
				if (t.id === _selId()) setSelectedTaskId(null);
				renderTasks();
				renderDetail();
			}
		});
		right.append(chk, del);

		(t.subtasks || []).forEach((s) => {
			const r = document.createElement("div");
			r.className = "sub-row";
			const cb = document.createElement("input");
			cb.type = "checkbox";
			cb.checked = !!s.done;
			cb.addEventListener("change", async () => {
				await M.toggleSubtask(t.id, s.id, cb.checked);
				renderTasks();
				renderDetail();
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
					renderTasks();
					renderDetail();
				}
			});
			r.append(cb, name, sd);
			subsBox.appendChild(r);
		});

		const _selId = () => {
			return import("../store.js").then((m) => m.getSelectedTaskId?.());
		};

		const rowClick = async (e) => {
			const ignore = [chk, del, expand];
			if (ignore.includes(e.target)) return;
			if (e.target.closest(".sub-row")) return;
			if (e.target !== title) {
				setSelectedTaskId(t.id);
				renderDetail();
			}
		};

		row.append(handle, expand, mid, right);
		row.append(subsBox);
		row.addEventListener("click", rowClick);

		els.taskList.appendChild(row);
		setProgress(bar, taskProgress(t));

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
