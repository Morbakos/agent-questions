import { DOCUMENT } from "@angular/common";
import { Injectable, computed, inject, signal } from "@angular/core";

export type ThemeMode = "system" | "light" | "dark";

const KEY = "aq-theme";
const ORDER: readonly ThemeMode[] = ["system", "light", "dark"];
const LABELS: Record<ThemeMode, string> = { system: "Auto", light: "Light", dark: "Dark" };

/**
 * Color theme: follows the system unless the user picks one. The choice is kept in `localStorage` and applied as
 * `data-theme` on `<html>`, which the tokens in `styles/_tokens.scss` read.
 */
@Injectable({ providedIn: "root" })
export class ThemeService {
	private readonly root = inject(DOCUMENT).documentElement;
	readonly mode = signal<ThemeMode>("system");
	readonly label = computed(() => LABELS[this.mode()]);

	/** Restores the saved choice; called once at startup, before the first render. */
	init(): void {
		this.apply(this.read());
	}

	/** Cycles system → light → dark. */
	next(): void {
		this.apply(ORDER[(ORDER.indexOf(this.mode()) + 1) % ORDER.length]);
		try {
			localStorage.setItem(KEY, this.mode());
		} catch {
			/* storage unavailable: the choice only lasts for this page */
		}
	}

	private read(): ThemeMode {
		try {
			const saved = localStorage.getItem(KEY);
			return ORDER.find((mode) => mode === saved) ?? "system";
		} catch {
			return "system";
		}
	}

	private apply(mode: ThemeMode): void {
		this.mode.set(mode);
		if (mode === "system") {
			delete this.root.dataset["theme"];
		} else {
			this.root.dataset["theme"] = mode;
		}
	}
}
