import { HttpErrorResponse } from "@angular/common/http";
import { provideRouter } from "@angular/router";
import { TestBed } from "@angular/core/testing";
import type { AdminSessionSummary } from "@agent-questions/shared";
import { ApiService } from "../../core/api";
import { button } from "../../../testing/dom";
import { AdminSessionsComponent } from "./sessions";

const item = (overrides: Partial<AdminSessionSummary>): AdminSessionSummary => ({
	id: "s1",
	title: "Database choice",
	status: "pending",
	createdAt: 1_700_000_000_000,
	answeredAt: null,
	questionCount: 2,
	ownerId: "u2",
	ownerUsername: "bob",
	...overrides,
});

describe("AdminSessionsComponent", () => {
	const api = { adminSessions: vi.fn() };

	beforeEach(() => {
		api.adminSessions.mockReset();
		TestBed.configureTestingModule({ providers: [{ provide: ApiService, useValue: api }, provideRouter([])] });
	});

	async function render() {
		const fixture = TestBed.createComponent(AdminSessionsComponent);
		await fixture.whenStable();
		fixture.detectChanges();
		return { fixture, el: fixture.nativeElement as HTMLElement };
	}

	it("lists the sessions with their owner, without any action button", async () => {
		api.adminSessions.mockResolvedValue({ items: [item({})], nextBefore: null });
		const { el } = await render();
		const row = el.querySelector("tbody tr")?.textContent ?? "";
		expect(row).toContain("Database choice");
		expect(row).toContain("bob");
		expect(row).toContain("Pending");
		expect(el.querySelector("tbody button")).toBeNull();
		expect(el.textContent).not.toContain("Show more");
	});

	it('shows the error, and not "No sessions", when the first load fails', async () => {
		api.adminSessions.mockRejectedValue(
			new HttpErrorResponse({ status: 403, error: { error: "Insufficient rights" } }),
		);
		const { el } = await render();
		expect(el.querySelector('[role="alert"]')?.textContent).toContain("Insufficient rights");
		expect(el.textContent).not.toContain("No sessions");
	});

	it('shows "No sessions" when there really is none', async () => {
		api.adminSessions.mockResolvedValue({ items: [], nextBefore: null });
		const { el } = await render();
		expect(el.textContent).toContain("No sessions");
	});

	it('keeps the rows already loaded when "Show more" fails, and does not duplicate a session', async () => {
		api.adminSessions
			.mockResolvedValueOnce({ items: [item({})], nextBefore: "10:a" })
			.mockRejectedValueOnce(new HttpErrorResponse({ status: 500 }))
			.mockResolvedValueOnce({ items: [item({}), item({ id: "s2", title: "Other" })], nextBefore: null });
		const { fixture, el } = await render();
		button(el, "Show more").click();
		await fixture.whenStable();
		fixture.detectChanges();
		expect(el.querySelectorAll("tbody tr")).toHaveLength(1);
		expect(el.querySelector('[role="alert"]')).not.toBeNull();
		button(el, "Show more").click();
		await fixture.whenStable();
		fixture.detectChanges();
		expect(el.querySelectorAll("tbody tr")).toHaveLength(2);
		expect(el.querySelector('[role="alert"]')).toBeNull();
	});

	it("loads the next page with the cursor", async () => {
		api.adminSessions
			.mockResolvedValueOnce({ items: [item({})], nextBefore: "1234:a" })
			.mockResolvedValueOnce({ items: [item({ id: "s2", title: "Other" })], nextBefore: null });
		const { fixture, el } = await render();
		button(el, "Show more").click();
		await fixture.whenStable();
		fixture.detectChanges();
		expect(api.adminSessions).toHaveBeenLastCalledWith("1234:a");
		expect(el.querySelectorAll("tbody tr")).toHaveLength(2);
		expect(el.textContent).not.toContain("Show more");
	});
});
