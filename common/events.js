import * as M from "./models.js";
import { els, setSelectedTaskId } from "./store.js";
import { renderTasks } from "./render/tasks.js";
import { renderGoals } from "./render/goals.js";
import { renderCalendar } from "./render/calendar.js";
import { renderDetail } from "./render/detail.js";
import { toast } from "./ui.js";

export function wireEvents() {
	document.addEventListener("keydown", (e) => {
		// Require Ctrl (or Cmd on macOS)
		if (!(e.ctrlKey || e.metaKey)) return;

		const k = e.key.toLowerCase();

		// Prevent browser defaults like Ctrl+N
		e.preventDefault();

		if (k === "/") {
			els.search?.focus();
		}
		if (k === "n") {
			els.newTask?.click();
		}
		if (k === "g") {
			els.newGoal?.click();
		}
		if (k === "d") {
			els.toggleCal?.click();
		}
	});

	els.newTask?.addEventListener("click", async () => {
		const t = await M.createTask({ title: "New task", priority: "med" });
		setSelectedTaskId(t.id);
		renderTasks();
		renderDetail();
	});
	els.newGoal?.addEventListener("click", async () => {
		await M.createGoal({ title: "New goal" });
		renderGoals();
		toast("Goal created");
	});
	els.toggleCal?.addEventListener("click", () => {
		els.calendarWrap.classList.toggle("hide");
		renderCalendar();
	});
	els.search?.addEventListener("input", renderTasks);
	els.filterStatus?.addEventListener("change", renderTasks);
	els.filterPri?.addEventListener("change", renderTasks);
}
