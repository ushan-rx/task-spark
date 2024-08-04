import * as M from "../models.js";
import { S, els, getSelectedTaskId, setSelectedTaskId } from "../store.js";
import { mdRender, isValidUrl } from "../util.js";
import { setProgress, toast } from "../ui.js";
import { taskProgress } from "../metrics.js";
import { toggleRightPane } from "../panes.js";

export function renderDetail() {
	const box = els.detail;
	box.innerHTML = "";
	const t = S.tasks.find((x) => x.id === getSelectedTaskId());

	// Toggle panes based on selection
	if (!t) {
		toggleRightPane(false); // show goals, hide detail
		box.innerHTML = `<div class="empty">Select a task or goal</div>`;
		return;
	}
	toggleRightPane(true); // show detail, hide goals

	// Back button
	const back = document.createElement("button");
	back.className = "back-btn";
	back.textContent = "← Back";
	back.addEventListener("click", () => {
		setSelectedTaskId(null);
		renderDetail();
	});
	box.appendChild(back);

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
		if (goalSel.value) await M.linkTaskToGoal(t.id, goalSel.value);
		else await M.unlinkTaskFromGoals(t.id);
		toast("Saved");
		renderDetail();
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
			renderDetail();
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
				renderDetail();
			}
		});
		row.append(ck, input, del);
		subs.appendChild(row);
	}
	const add = document.createElement("button");
	add.textContent = "+ Subtask";
	add.addEventListener("click", async () => {
		await M.createSubtask(t.id, "New subtask");
		renderDetail();
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

	// Delete task
	wrap.querySelector("#del").addEventListener("click", async () => {
		if (window.confirm("Delete this task?")) {
			await M.deleteTask(t.id);
			setSelectedTaskId(null);
			renderDetail();
		}
	});
}
