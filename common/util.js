// Utility helpers: ids, dates, markdown-lite sanitize/format, URL validation, fuzzy search.

// Cryptographically strong id
export function uid(prefix = "id") {
	const arr = new Uint32Array(2);
	crypto.getRandomValues(arr);
	return `${prefix}_${arr[0].toString(36)}${arr[1].toString(36)}`;
}

// Date helpers
// return today(default) or given date in yy-mm-dd fromat
export function todayYMD(d = new Date()) {
	const z = (n) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}

// to parse a date string(yy-mm-dd) to date obj
export function parseYMD(ymd) {
	if (!ymd) return null;
	const [y, m, d] = ymd.split("-").map(Number);
	if (!y || !m || !d) return null;
	const dt = new Date(y, m - 1, d);
	return Number.isNaN(dt.getTime()) ? null : dt;
}

export function isToday(ymd, now = new Date()) {
	return ymd === todayYMD(now);
}
export function isThisWeek(ymd, startMonday = true, now = new Date()) {
	const d = parseYMD(ymd);
	if (!d) return false;
	const n = new Date(now);
	const day = n.getDay(); // 0=Sun
	const diff = startMonday ? (day === 0 ? -6 : 1 - day) : -day;
	const start = new Date(n);
	start.setDate(n.getDate() + diff);
	start.setHours(0, 0, 0, 0);
	const end = new Date(start);
	end.setDate(start.getDate() + 6);
	end.setHours(23, 59, 59, 999);
	return d >= start && d <= end;
}

export function daysBetween(aYMD, bYMD) {
	const a = parseYMD(aYMD),
		b = parseYMD(bYMD);
	if (!a || !b) return 0;
	const ms = 24 * 3600 * 1000;
	return Math.round((b - a) / ms);
}

// Priority weights for metrics
export const PRIORITY_WEIGHT = { low: 1, med: 2, high: 3 };
