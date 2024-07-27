// chrome.storage.local wrapper with versioned schema + migrations, namespaced keys.
const NS = "taskspark";
const KEY = (k) => `${NS}:${k}`;

const DEFAULTS = {
	tasks: [],
	goals: [],
	daily: [], // [{date, completedTaskIds:[], createdAt}]
	settings: {
		theme: "system",
		notifications: false,
		weekStartMonday: true,
		seeded: false,
	},
	schemaVersion: 1,
};

export async function getAll() {
	const res = await chrome.storage.local.get(
		Object.fromEntries(Object.keys(DEFAULTS).map((k) => [KEY(k), null]))
	);
	const out = {};
	for (const k of Object.keys(DEFAULTS)) {
		out[k] = res[KEY(k)] ?? DEFAULTS[k];
	}
	return out;
}

export async function setPatch(patch) {
	const toSet = {};
	for (const [k, v] of Object.entries(patch)) {
		toSet[KEY(k)] = v;
	}
	await chrome.storage.local.set(toSet);
}

export async function migrate() {
	const { schemaVersion } = await getAll();
	let v = schemaVersion || 0;
	if (v === 0) {
		// Initial install -> v1
		v = 1;
	}
	if (v !== (await getAll()).schemaVersion) {
		await setPatch({ schemaVersion: v });
	}
}

// Convenience getters/setters
export async function get(k) {
	return (await getAll())[k];
}
export async function set(k, v) {
	await setPatch({ [k]: v });
}

// Subscribe to changes
export function onChange(callback) {
	chrome.storage.onChanged.addListener((changes, area) => {
		if (area !== "local") return;
		const patch = {};
		for (const [k, { newValue }] of Object.entries(changes)) {
			if (k.startsWith(`${NS}:`)) {
				patch[k.slice(NS.length + 1)] = newValue;
			}
		}
		if (Object.keys(patch).length) callback(patch);
	});
}
