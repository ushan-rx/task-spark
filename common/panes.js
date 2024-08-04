import { els } from "./store.js";

export function toggleRightPane(showDetail) {
	if (showDetail) {
		els.detailCard.classList.remove("hide");
		els.goalsCard.classList.add("hide");
	} else {
		els.detailCard.classList.add("hide");
		els.goalsCard.classList.remove("hide");
	}
}
