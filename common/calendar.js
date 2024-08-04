// Tiny calendar renderers (month & week) with no libraries.
import { todayYMD, parseYMD } from "./util.js";

export function renderMonthCalendar(
	container,
	year,
	monthIndex /*0-11*/,
	selectedYMD,
	onPick
) {
	container.innerHTML = "";
	const header = document.createElement("div");
	header.className = "cal-header";
	const title = document.createElement("div");
	title.textContent = new Date(year, monthIndex).toLocaleString([], {
		month: "long",
		year: "numeric",
	});
	header.appendChild(title);
	container.appendChild(header);

	const grid = document.createElement("div");
	grid.className = "cal-grid";
	const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
	for (const d of days) {
		const el = document.createElement("div");
		el.className = "cal-dow";
		el.textContent = d;
		grid.appendChild(el);
	}

	const first = new Date(year, monthIndex, 1);
	const offset = (first.getDay() + 6) % 7; // Monday-first
	for (let i = 0; i < offset; i++) {
		const empty = document.createElement("div");
		empty.className = "cal-cell empty";
		grid.appendChild(empty);
	}

	const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
	for (let d = 1; d <= daysInMonth; d++) {
		const cell = document.createElement("button");
		cell.className = "cal-cell";
		const ymd = `${year}-${String(monthIndex + 1).padStart(
			2,
			"0"
		)}-${String(d).padStart(2, "0")}`;
		cell.dataset.ymd = ymd;
		cell.textContent = String(d);
		if (ymd === todayYMD()) cell.classList.add("today");
		if (ymd === selectedYMD) cell.classList.add("selected");
		cell.addEventListener("click", () => onPick?.(ymd));
		grid.appendChild(cell);
	}
	container.appendChild(grid);
}

export function renderWeekStrip(container, referenceYMD, onPick) {
	container.innerHTML = "";
	const ref = parseYMD(referenceYMD) || new Date();
	const day = (ref.getDay() + 6) % 7;
	const start = new Date(ref);
	start.setDate(ref.getDate() - day);
	const wrap = document.createElement("div");
	wrap.className = "week-strip";
	for (let i = 0; i < 7; i++) {
		const d = new Date(start);
		d.setDate(start.getDate() + i);
		const ymd = d.toISOString().slice(0, 10);
		const b = document.createElement("button");
		b.textContent =
			d.toLocaleString([], { weekday: "short" }) + " " + d.getDate();
		b.className = "week-day" + (ymd === todayYMD() ? " today" : "");
		b.addEventListener("click", () => onPick?.(ymd));
		wrap.appendChild(b);
	}
	container.appendChild(wrap);
}
