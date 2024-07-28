// Models & CRUD helpers for Tasks, Goals, Daily records.
import { get, set } from "./storage.js";
import { uid, todayYMD } from "./util.js";

export async function listTasks() {
	return await get("tasks");
}
export async function listGoals() {
	return await get("goals");
}
export async function listDaily() {
	return await get("daily");
}

export async function createTask(partial) {
	const tasks = await listTasks();
	const now = new Date().toISOString();
	const repeat = partial.repeat || (partial.isDaily ? "daily" : "once");
	const t = {
		id: uid("task"),
		title: partial.title?.trim() || "Untitled",
		description: partial.description || "",
		dueDate: partial.dueDate || "",
		time: partial.time || "",
		priority: partial.priority || "med",
		tags: Array.isArray(partial.tags) ? partial.tags : [],
		urls: Array.isArray(partial.urls) ? partial.urls : [],
		subtasks: Array.isArray(partial.subtasks) ? partial.subtasks : [],
		status: partial.status || "todo",
		goalId: partial.goalId || null,
		isDaily: repeat === "daily" ? true : !!partial.isDaily,
		repeat, // "once" | "daily" | "weekly"
		createdAt: now,
		updatedAt: now,
	};
	tasks.push(t);
	await set("tasks", tasks);
	return t;
}

export async function updateTask(id, patch) {
	const tasks = await listTasks();
	const i = tasks.findIndex((t) => t.id === id);
	if (i === -1) return null;

	// keep isDaily in sync with repeat for backward-compat
	let next = { ...tasks[i], ...patch, updatedAt: new Date().toISOString() };
	if (Object.prototype.hasOwnProperty.call(patch, "repeat")) {
		next.isDaily = patch.repeat === "daily";
	}
	tasks[i] = next;
	await set("tasks", tasks);
	return tasks[i];
}

export async function deleteTask(id) {
	const tasks = await listTasks();
	await set(
		"tasks",
		tasks.filter((t) => t.id !== id)
	);
	// Remove from any goals
	const goals = await listGoals();
	let changed = false;
	for (const g of goals) {
		const before = g.taskIds.length;
		g.taskIds = g.taskIds.filter((x) => x !== id);
		changed ||= before !== g.taskIds.length;
	}
	if (changed) await set("goals", goals);
}

export async function reorderTasks(newOrderIds) {
	const tasks = await listTasks();
	const byId = new Map(tasks.map((t) => [t.id, t]));
	const ordered = newOrderIds.map((id) => byId.get(id)).filter(Boolean);
	const rest = tasks.filter((t) => !byId.has(t.id));
	await set("tasks", [...ordered, ...rest]);
}

export async function createSubtask(taskId, title) {
	const tasks = await listTasks();
	const i = tasks.findIndex((t) => t.id === taskId);
	if (i === -1) return null;
	const t = tasks[i];
	t.subtasks.push({ id: uid("sub"), title: title || "Subtask", done: false });
	t.updatedAt = new Date().toISOString();
	tasks[i] = t;
	await set("tasks", tasks);
	return t;
}
export async function toggleSubtask(taskId, subId, done) {
	const tasks = await listTasks();
	const i = tasks.findIndex((t) => t.id === taskId);
	if (i === -1) return null;
	const t = tasks[i];
	t.subtasks = t.subtasks.map((s) => (s.id === subId ? { ...s, done } : s));
	// If all subtasks done, flip task status to done (leave as-is otherwise)
	if (t.subtasks.length && t.subtasks.every((s) => s.done)) t.status = "done";
	t.updatedAt = new Date().toISOString();
	tasks[i] = t;
	await set("tasks", tasks);
	return t;
}
export async function renameSubtask(taskId, subId, title) {
	const tasks = await listTasks();
	const i = tasks.findIndex((t) => t.id === taskId);
	if (i === -1) return null;
	const t = tasks[i];
	t.subtasks = t.subtasks.map((s) =>
		s.id === subId ? { ...s, title: (title || "").trim() || s.title } : s
	);
	t.updatedAt = new Date().toISOString();
	tasks[i] = t;
	await set("tasks", tasks);
	return t;
}
export async function deleteSubtask(taskId, subId) {
	const tasks = await listTasks();
	const i = tasks.findIndex((t) => t.id === taskId);
	if (i === -1) return null;
	const t = tasks[i];
	t.subtasks = t.subtasks.filter((s) => s.id !== subId);
	// If no subtasks left and task was done only because of subtasks, leave status as-is.
	t.updatedAt = new Date().toISOString();
	tasks[i] = t;
	await set("tasks", tasks);
	return t;
}
export async function setAllSubtasksDone(taskId) {
	const tasks = await listTasks();
	const i = tasks.findIndex((t) => t.id === taskId);
	if (i === -1) return null;
	const t = tasks[i];
	t.subtasks = t.subtasks.map((s) => ({ ...s, done: true }));
	t.updatedAt = new Date().toISOString();
	tasks[i] = t;
	await set("tasks", tasks);
	return t;
}

// Goals
export async function createGoal(partial) {
	const goals = await listGoals();
	const now = new Date().toISOString();
	const g = {
		id: uid("goal"),
		title: partial.title?.trim() || "New Goal",
		description: partial.description || "",
		targetDate: partial.targetDate || "",
		taskIds: Array.isArray(partial.taskIds) ? partial.taskIds : [],
		createdAt: now,
		updatedAt: now,
	};
	goals.push(g);
	await set("goals", goals);
	return g;
}
export async function updateGoal(id, patch) {
	const goals = await listGoals();
	const i = goals.findIndex((g) => g.id === id);
	if (i === -1) return null;
	goals[i] = { ...goals[i], ...patch, updatedAt: new Date().toISOString() };
	await set("goals", goals);
	return goals[i];
}
export async function deleteGoal(id) {
	const goals = await listGoals();
	const g = goals.find((x) => x.id === id);
	if (!g) return false;
	// Unlink tasks that point to this goal
	const tasks = await listTasks();
	for (const t of tasks) {
		if (t.goalId === id) t.goalId = null;
	}
	await set("tasks", tasks);
	await set(
		"goals",
		goals.filter((x) => x.id !== id)
	);
	return true;
}

export async function linkTaskToGoal(taskId, goalId) {
	const goals = await listGoals();
	// remove from any existing goal first (single-goal assignment)
	for (const gg of goals) gg.taskIds = gg.taskIds.filter((x) => x !== taskId);
	const g = goals.find((x) => x.id === goalId);
	if (!g) {
		await set("goals", goals);
		await updateTask(taskId, { goalId: null });
		return null;
	}
	if (!g.taskIds.includes(taskId)) g.taskIds.push(taskId);
	await set("goals", goals);
	await updateTask(taskId, { goalId });
	return g;
}
export async function unlinkTaskFromGoals(taskId) {
	const goals = await listGoals();
	let changed = false;
	for (const g of goals) {
		const before = g.taskIds.length;
		g.taskIds = g.taskIds.filter((x) => x !== taskId);
		if (g.taskIds.length !== before) changed = true;
	}
	if (changed) await set("goals", goals);
	await updateTask(taskId, { goalId: null });
	return true;
}
