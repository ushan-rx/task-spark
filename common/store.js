export const S = { tasks: [], goals: [], daily: [], settings: {} };

let _selectedTaskId = null;
let _selectedDateFilter = ""; // YYYY-MM-DD or ""

export const els = {
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
	goalsCard: document.querySelector(".card.goals"),
	detailCard: document.getElementById("detail"),
};

export function getSelectedTaskId() {
	return _selectedTaskId;
}
export function setSelectedTaskId(id) {
	_selectedTaskId = id;
}
export function getSelectedDateFilter() {
	return _selectedDateFilter;
}
export function setSelectedDateFilter(v) {
	_selectedDateFilter = v;
}

export function setStatePatch(patch) {
	for (const [k, v] of Object.entries(patch)) S[k] = v;
}
