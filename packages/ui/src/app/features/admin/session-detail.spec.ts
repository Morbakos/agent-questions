import { TestBed } from "@angular/core/testing";
import { ActivatedRoute, provideRouter } from "@angular/router";
import type { AdminSessionView } from "@agent-questions/shared";
import { ApiService } from "../../core/api";
import { AdminSessionDetailComponent } from "./session-detail";

const session: AdminSessionView = {
	id: "s1",
	title: "Database choice",
	status: "answered",
	revision: 0,
	questions: [
		{
			id: "db",
			header: "Database",
			prompt: "Which **database**?",
			type: "single",
			options: [
				{ id: "pg", label: "PostgreSQL" },
				{ id: "sq", label: "SQLite" },
			],
		},
	],
	draft: {},
	answers: { db: { selected: ["sq"], text: "to get started" } },
	declineReason: null,
	readOnly: true,
	ownerId: "u2",
	ownerUsername: "bob",
};

describe("AdminSessionDetailComponent", () => {
	const api = { adminSession: vi.fn() };

	beforeEach(() => {
		api.adminSession.mockReset();
		TestBed.configureTestingModule({
			providers: [
				provideRouter([]),
				{ provide: ApiService, useValue: api },
				{ provide: ActivatedRoute, useValue: { snapshot: { paramMap: new Map([["id", "s1"]]) } } },
			],
		});
	});

	async function render() {
		const fixture = TestBed.createComponent(AdminSessionDetailComponent);
		await fixture.whenStable();
		fixture.detectChanges();
		return fixture.nativeElement as HTMLElement;
	}

	it("shows the owner, the questions and the answers, read-only", async () => {
		api.adminSession.mockResolvedValue(session);
		const el = await render();
		expect(api.adminSession).toHaveBeenCalledWith("s1");
		expect(el.textContent).toContain("Read-only");
		expect(el.textContent).toContain("bob");
		expect(el.querySelector(".md strong")?.textContent).toBe("database");
		expect(el.querySelector("li")?.textContent?.trim()).toBe("SQLite");
		expect(el.querySelector("blockquote")?.textContent).toBe("to get started");
		expect(el.querySelector("button, input, textarea, select")).toBeNull();
	});

	it("shows the draft of a pending session, with an unknown option shown by its id", async () => {
		api.adminSession.mockResolvedValue({
			...session,
			status: "pending",
			answers: null,
			draft: { db: { selected: ["unknown"], text: "" } },
		});
		const el = await render();
		expect(el.textContent).toContain("awaiting an answer");
		expect(el.querySelector("li")?.textContent?.trim()).toBe("unknown");
	});

	it("shows the decline and its reason, without an answer", async () => {
		api.adminSession.mockResolvedValue({
			...session,
			status: "declined",
			answers: null,
			declineReason: "no time",
		});
		const el = await render();
		expect(el.textContent).toContain("declined");
		expect(el.textContent).toContain("no time");
		expect(el.textContent).toContain("No answer");
	});

	it("shows the error when the session is not found", async () => {
		api.adminSession.mockRejectedValue(new Error("x"));
		const el = await render();
		expect(el.querySelector('[role="alert"]')).not.toBeNull();
	});
});
