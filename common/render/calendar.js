import { els, getSelectedDateFilter, setSelectedDateFilter } from "../store.js";
import { todayYMD, parseYMD } from "../util.js";
import { renderMonthCalendar, renderWeekStrip } from "../calendar.js";
import { renderTasks } from "./tasks.js";

export function renderCalendar() {
	if (els.calendarWrap.classList.contains("hide")) return;
	const base = getSelectedDateFilter() || todayYMD();
	renderWeekStrip(els.week, base, (ymd) => {
		setSelectedDateFilter(ymd);
		renderTasks();
	});
	const d = parseYMD(base);
	renderMonthCalendar(
		els.month,
		d.getFullYear(),
		d.getMonth(),
		getSelectedDateFilter(),
		(ymd) => {
			setSelectedDateFilter(ymd);
			renderTasks();
		}
	);
}
