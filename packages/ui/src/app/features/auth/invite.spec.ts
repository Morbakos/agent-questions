import { TestBed } from "@angular/core/testing";
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from "@angular/router";
import { AccountsApi } from "../../core/accounts-api";
import { AuthService } from "../../core/auth";
import { button, typeInto } from "../../../testing/dom";
import { InviteComponent } from "./invite";

describe("InviteComponent", () => {
	const api = { invitation: vi.fn() };
	const auth = { acceptInvitation: vi.fn() };
	let navigate: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		api.invitation.mockReset();
		auth.acceptInvitation.mockReset();
		TestBed.configureTestingModule({
			providers: [
				provideRouter([]),
				{ provide: AccountsApi, useValue: api },
				{ provide: AuthService, useValue: auth },
				{
					provide: ActivatedRoute,
					useValue: { snapshot: { paramMap: convertToParamMap({ token: "t0k3n" }) } },
				},
			],
		});
		navigate = vi.spyOn(TestBed.inject(Router), "navigateByUrl").mockResolvedValue(true);
	});

	async function render() {
		const fixture = TestBed.createComponent(InviteComponent);
		await fixture.whenStable();
		fixture.detectChanges();
		return { fixture, el: fixture.nativeElement as HTMLElement };
	}

	it("greets the invitee by username", async () => {
		api.invitation.mockResolvedValue({ username: "bob" });
		const { el } = await render();
		expect(api.invitation).toHaveBeenCalledWith("t0k3n");
		expect(el.textContent).toContain("bob");
	});

	it("reports an invalid or expired link, without offering a form", async () => {
		api.invitation.mockRejectedValue(new Error("404"));
		const { el } = await render();
		expect(el.querySelector('[role="alert"]')?.textContent).toContain("invalid or has expired");
		expect(el.querySelector("form")).toBeNull();
	});

	it("rejects a password that is too short or a mismatched confirmation", async () => {
		api.invitation.mockResolvedValue({ username: "bob" });
		const { fixture, el } = await render();
		typeInto(el, 'input[formControlName="password"]', "short");
		typeInto(el, 'input[formControlName="confirm"]', "short");
		fixture.detectChanges();
		expect(button(el, "Create my access").disabled).toBe(true);

		typeInto(el, 'input[formControlName="password"]', "a-solid-password");
		typeInto(el, 'input[formControlName="confirm"]', "another-password");
		fixture.detectChanges();
		expect(button(el, "Create my access").disabled).toBe(true);
		expect(el.textContent).toContain("do not match");
	});

	it("saves the password then opens the home page, signed in", async () => {
		api.invitation.mockResolvedValue({ username: "bob" });
		auth.acceptInvitation.mockResolvedValue(undefined);
		const { fixture, el } = await render();
		typeInto(el, 'input[formControlName="password"]', "a-solid-password");
		typeInto(el, 'input[formControlName="confirm"]', "a-solid-password");
		fixture.detectChanges();
		button(el, "Create my access").click();
		await fixture.whenStable();
		expect(auth.acceptInvitation).toHaveBeenCalledWith("t0k3n", "a-solid-password");
		expect(navigate).toHaveBeenCalledWith("/");
	});
});
