import * as M from "../models.js";
import { S, els } from "../store.js";
import { goalProgress } from "../metrics.js";
import { toast } from "../ui.js";

export function renderGoals() {
	els.goalList.innerHTML = "";
	if (!S.goals.length) {
		els.goalList.innerHTML = `<div class="empty">No goals yet.</div>`;
		return;
	}
	for (const g of S.goals) {
		const row = document.createElement("div");
		row.className = "goal-row";
		const left = document.createElement("div");
		const title = document.createElement("div");
		title.contentEditable = "true";
		title.spellcheck = false;
		title.textContent = g.title;
		const meta = document.createElement("div");
		meta.className = "meta";
		const date = document.createElement("input");
		date.type = "date";
		date.value = g.targetDate || "";
		const desc = document.createElement("div");
		desc.contentEditable = "true";
		desc.className = "meta";
		desc.textContent = g.description || "";
		meta.append(date);
		left.append(title, meta, desc);

		const actions = document.createElement("div");
		actions.className = "goal-actions";
		const save = document.createElement("button");
		save.textContent = "Save";
		save.addEventListener("click", async () => {
			await M.updateGoal(g.id, {
				title: title.textContent.trim(),
				targetDate: date.value,
				description: desc.textContent.trim(),
			});
			toast("Goal saved");
			renderGoals();
		});
		const del = document.createElement("button");
		del.textContent = "🗑";
		del.className = "del small";
		del.addEventListener("click", async () => {
			if (window.confirm("Delete this goal?")) {
				await M.deleteGoal(g.id);
				renderGoals();
			}
		});

		const canvas = document.createElement("canvas");
		canvas.width = 64;
		canvas.height = 64;
		actions.append(canvas, save, del);
		row.append(left, actions);
		els.goalList.appendChild(row);
		drawDonut(canvas, goalProgress(g, S.tasks));
	}
}

function drawDonut(canvas, ratio) {
	const ctx = canvas.getContext("2d");
	const cx = canvas.width / 2,
		cy = canvas.height / 2,
		r = 26,
		lw = 8;
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	ctx.lineWidth = lw;
	ctx.lineCap = "round";
	ctx.strokeStyle = "#e5e7eb";
	ctx.beginPath();
	ctx.arc(cx, cy, r, 0, Math.PI * 2);
	ctx.stroke();
	ctx.strokeStyle = "#22c55e";
	const end = -Math.PI / 2 + ratio * Math.PI * 2;
	ctx.beginPath();
	ctx.arc(cx, cy, r, -Math.PI / 2, end);
	ctx.stroke();
	ctx.fillStyle = "#94a3b8";
	ctx.font = "12px system-ui";
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText(`${Math.round(ratio * 100)}%`, cx, cy);
}
