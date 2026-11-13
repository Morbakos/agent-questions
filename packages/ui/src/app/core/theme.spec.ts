import { TestBed } from "@angular/core/testing";
import { ThemeService } from "./theme";

describe("ThemeService", () => {
	beforeEach(() => {
		localStorage.clear();
		delete document.documentElement.dataset["theme"];
	});

	it("follows the system by default", () => {
		const theme = TestBed.inject(ThemeService);
		theme.init();
		expect(theme.mode()).toBe("system");
		expect(document.documentElement.dataset["theme"]).toBeUndefined();
	});

	it("cycles system, light, dark and back, and applies data-theme", () => {
		const theme = TestBed.inject(ThemeService);
		theme.init();
		theme.next();
		expect(document.documentElement.dataset["theme"]).toBe("light");
		theme.next();
		expect(document.documentElement.dataset["theme"]).toBe("dark");
		expect(theme.label()).toBe("Dark");
		theme.next();
		expect(theme.mode()).toBe("system");
		expect(document.documentElement.dataset["theme"]).toBeUndefined();
	});

	it("restores the saved choice", () => {
		localStorage.setItem("aq-theme", "dark");
		const theme = TestBed.inject(ThemeService);
		theme.init();
		expect(theme.mode()).toBe("dark");
		expect(document.documentElement.dataset["theme"]).toBe("dark");
	});

	it("ignores an unknown saved value", () => {
		localStorage.setItem("aq-theme", "pink");
		const theme = TestBed.inject(ThemeService);
		theme.init();
		expect(theme.mode()).toBe("system");
	});
});
