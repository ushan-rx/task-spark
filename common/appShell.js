import { getAll, migrate, onChange } from "./storage.js";
import { S, setStatePatch, els, setSelectedTaskId } from "./store.js";
import { toggleRightPane } from "./panes.js";
import { renderTasks } from "./render/tasks.js";
import { renderGoals } from "./render/goals.js";
import { renderDetail } from "./render/detail.js";
import { renderCalendar } from "./render/calendar.js";
import { renderKPIs } from "./render/kpis.js";
import { wireEvents } from "./events.js";

async function init() {
	await migrate();
	Object.assign(S, await getAll());
	// default: goals visible and detail hidden
	toggleRightPane(false);
	renderAll();
}

onChange((patch) => {
	setStatePatch(patch);
	renderAll();
});

function renderAll() {
	renderKPIs();
	renderCalendar();
	renderTasks();
	renderGoals();
	renderDetail(); // decides which pane is visible (goal or details)
}

export async function boot() {
	wireEvents();
	await init();
}
