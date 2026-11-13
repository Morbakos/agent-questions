import { HttpErrorResponse } from "@angular/common/http";
import { signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import type { UserSummary } from "@agent-questions/shared";
import { AccountsApi } from "../../core/accounts-api";
import { AuthService } from "../../core/auth";
import { button, typeInto } from "../../../testing/dom";
import { UsersComponent } from "./users";

const user = (overrides: Partial<UserSummary>): UserSummary => ({
	id: "u1",
	username: "admin",
	role: "admin",
	disabled: false,
	pending: false,
	createdAt: 1_700_000_000_000,
	...overrides,
});

describe("UsersComponent", () => {
	const api = { users: vi.fn(), createUser: vi.fn(), reinvite: vi.fn(), updateUser: vi.fn() };
	const auth = { me: signal({ userId: "u1", username: "admin" }) };
	const bob = user({ id: "u2", username: "bob", role: "member", pending: true });

	beforeEach(() => {
		for (const fn of Object.values(api)) {
			fn.mockReset();
		}
		api.users.mockResolvedValue([user({}), bob]);
		TestBed.configureTestingModule({
			providers: [
				{ provide: AccountsApi, useValue: api },
				{ provide: AuthService, useValue: auth },
			],
		});
	});

	async function render() {
		const fixture = TestBed.createComponent(UsersComponent);
		await fixture.whenStable();
		fixture.detectChanges();
		return { fixture, el: fixture.nativeElement as HTMLElement };
	}

	const rowOf = (el: HTMLElement, name: string) =>
		Array.from(el.querySelectorAll("tbody tr")).find((row) => row.textContent?.includes(name)) as HTMLElement;

	it("lists the accounts with their role and state", async () => {
		const { el } = await render();
		expect(rowOf(el, "admin").textContent).toContain("Administrator");
		expect(rowOf(el, "admin").textContent).toContain("Active");
		expect(rowOf(el, "bob").textContent).toContain("Member");
		expect(rowOf(el, "bob").textContent).toContain("Invitation pending");
	});

	it("creates an account and shows the invitation link to pass on", async () => {
		api.createUser.mockResolvedValue({
			user: bob,
			inviteUrl: "https://questions.example.com/invite/abc123",
			expiresAt: 1_800_000_000_000,
		});
		const { fixture, el } = await render();
		typeInto(el, 'input[formControlName="username"]', "bob");
		fixture.detectChanges();
		button(el, "Create and invite").click();
		await fixture.whenStable();
		fixture.detectChanges();
		expect(api.createUser).toHaveBeenCalledWith("bob", "member");
		expect(el.querySelector(".secret")?.textContent).toBe("https://questions.example.com/invite/abc123");
	});

	it("rejects an invalid username before even calling the server", async () => {
		const { fixture, el } = await render();
		typeInto(el, 'input[formControlName="username"]', "a b");
		fixture.detectChanges();
		expect(button(el, "Create and invite").disabled).toBe(true);
	});

	it("generates a new link, promotes and disables an account", async () => {
		api.reinvite.mockResolvedValue({ user: bob, inviteUrl: "https://q.example/invite/fresh", expiresAt: 1 });
		api.updateUser.mockResolvedValue(bob);
		const { fixture, el } = await render();
		button(rowOf(el, "bob"), "New link").click();
		await fixture.whenStable();
		expect(api.reinvite).toHaveBeenCalledWith("u2");

		button(rowOf(el, "bob"), "Promote").click();
		await fixture.whenStable();
		expect(api.updateUser).toHaveBeenCalledWith("u2", { role: "admin" });

		button(rowOf(el, "bob"), "Disable").click();
		fixture.detectChanges();
		button(rowOf(el, "bob"), "Confirm").click();
		await fixture.whenStable();
		expect(api.updateUser).toHaveBeenCalledWith("u2", { disabled: true, revokeTokens: true });
	});

	it("asks for confirmation before disabling, with token deletion checked by default", async () => {
		api.updateUser.mockResolvedValue(bob);
		const { fixture, el } = await render();
		button(rowOf(el, "bob"), "Disable").click();
		fixture.detectChanges();
		expect(api.updateUser).not.toHaveBeenCalled();
		const box = rowOf(el, "bob").querySelector<HTMLInputElement>('input[type="checkbox"]');
		expect(box?.checked).toBe(true);
		expect(rowOf(el, "bob").textContent).toContain("Also delete their API tokens");

		box?.click();
		fixture.detectChanges();
		button(rowOf(el, "bob"), "Confirm").click();
		await fixture.whenStable();
		expect(api.updateUser).toHaveBeenCalledWith("u2", { disabled: true, revokeTokens: false });
	});

	it("cancels the disabling without sending anything", async () => {
		const { fixture, el } = await render();
		button(rowOf(el, "bob"), "Disable").click();
		fixture.detectChanges();
		button(rowOf(el, "bob"), "Cancel").click();
		fixture.detectChanges();
		expect(api.updateUser).not.toHaveBeenCalled();
		expect(rowOf(el, "bob").querySelector('input[type="checkbox"]')).toBeNull();
	});

	it("re-enables an account in one click, without confirmation", async () => {
		api.users.mockResolvedValue([user({}), user({ id: "u2", username: "bob", role: "member", disabled: true })]);
		api.updateUser.mockResolvedValue(bob);
		const { fixture, el } = await render();
		button(rowOf(el, "bob"), "Enable").click();
		await fixture.whenStable();
		expect(api.updateUser).toHaveBeenCalledWith("u2", { disabled: false });
	});

	it("prevents an admin from disabling themselves", async () => {
		const { el } = await render();
		expect(button(rowOf(el, "admin"), "Disable").disabled).toBe(true);
		expect(button(rowOf(el, "bob"), "Disable").disabled).toBe(false);
	});

	it("shows the server error (for example, last admin)", async () => {
		api.updateUser.mockRejectedValue(
			new HttpErrorResponse({ status: 409, error: { error: "At least one active administrator must remain" } }),
		);
		api.users.mockResolvedValue([user({}), user({ id: "u3", username: "carol", role: "admin" })]);
		const { fixture, el } = await render();
		button(rowOf(el, "carol"), "Demote").click();
		await fixture.whenStable();
		fixture.detectChanges();
		expect(el.querySelector('[role="alert"]')?.textContent).toContain("At least one active administrator");
	});

	it("allows neither self-demotion nor self-disabling, and names each button after its account", async () => {
		const { el } = await render();
		const own = rowOf(el, "admin");
		expect(button(own, "Demote").disabled).toBe(true);
		expect(button(own, "Disable").disabled).toBe(true);
		expect(button(rowOf(el, "bob"), "Promote").getAttribute("aria-label")).toBe("Promote bob");
	});
});
