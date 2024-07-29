// UI helpers: toasts, dialogs, animations (progress, confetti), ARIA live regions.
let liveRegion;
export function ensureLiveRegion() {
	if (liveRegion) return liveRegion;
	liveRegion = document.createElement("div");
	liveRegion.setAttribute("aria-live", "polite");
	liveRegion.className = "sr-only";
	document.body.appendChild(liveRegion);
	return liveRegion;
}
export function announce(msg) {
	ensureLiveRegion().textContent = msg;
}

export function toast(msg, ms = 1800) {
	const t = document.createElement("div");
	t.className = "toast";
	t.textContent = msg;
	document.body.appendChild(t);
	requestAnimationFrame(() => t.classList.add("show"));
	const close = () => t.classList.remove("show");
	setTimeout(close, ms);
	t.addEventListener("transitionend", () => t.remove());
}



// Animate progress bar width (CSS handles transition).
export function setProgress(el, ratio) {
	el.style.width = `${Math.round(100 * ratio)}%`;
	el.setAttribute("aria-valuenow", String(Math.round(100 * ratio)));
}

// Confetti-lite on 100% (respects reduced motion)
export function celebrate(node) {
	if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
	const c = document.createElement("canvas");
	c.className = "confetti";
	node.appendChild(c);
	const ctx = c.getContext("2d");
	const { width, height } = node.getBoundingClientRect();
	c.width = width;
	c.height = height;
	const pieces = Array.from({ length: 40 }, () => ({
		x: Math.random() * width,
		y: -10 - Math.random() * 20,
		vy: 2 + Math.random() * 3,
		vx: -1 + Math.random() * 2,
		r: 2 + Math.random() * 3,
	}));
	let t = 0;
	function step() {
		t++;
		ctx.clearRect(0, 0, width, height);
		for (const p of pieces) {
			p.x += p.vx;
			p.y += p.vy;
			ctx.beginPath();
			ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
			ctx.fill();
		}
		if (t < 60) requestAnimationFrame(step);
		else c.remove();
	}
	step();
}
