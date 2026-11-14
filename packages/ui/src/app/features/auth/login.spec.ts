import { HttpErrorResponse } from "@angular/common/http";
import { TestBed } from "@angular/core/testing";
import { Router, provideRouter } from "@angular/router";
import { AuthService } from "../../core/auth";
import { button, typeInto } from "../../../testing/dom";
import { LoginComponent } from "./login";

describe("LoginComponent", () => {
	const auth = { login: vi.fn() };
	let navigate: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		auth.login.mockReset();
		TestBed.configureTestingModule({
			providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
		});
		navigate = vi.spyOn(TestBed.inject(Router), "navigateByUrl").mockResolvedValue(true);
	});

	async function render() {
		const fixture = TestBed.createComponent(LoginComponent);
		await fixture.whenStable();
		return { fixture, el: fixture.nativeElement as HTMLElement };
	}

	it.each([
		["/s/abc", "/s/abc"],
		["//other.example", "/"],
		["https://other.example", "/"],
		[undefined, "/"],
	])(
		"after sign-in, returns to the requested page (%s) without following an external URL",
		async (returnUrl, expected) => {
			const router = TestBed.inject(Router);
			vi.spyOn(router, "url", "get").mockReturnValue(
				returnUrl === undefined ? "/login" : `/login?returnUrl=${encodeURIComponent(returnUrl)}`,
			);
			auth.login.mockResolvedValue(undefined);
			const { fixture, el } = await render();
			typeInto(el, 'input[formControlName="username"]', "alice");
			typeInto(el, 'input[formControlName="password"]', "long-password");
			fixture.detectChanges();
			button(el, "Sign in").click();
			await fixture.whenStable();
			expect(navigate).toHaveBeenCalledWith(expected);
		},
	);

	it("does not allow submitting an empty form", async () => {
		const { el } = await render();
		expect(button(el, "Sign in").disabled).toBe(true);
	});

	it("signs in then opens the home page", async () => {
		auth.login.mockResolvedValue(undefined);
		const { fixture, el } = await render();
		typeInto(el, 'input[formControlName="username"]', "alice");
		typeInto(el, 'input[formControlName="password"]', "long-password");
		fixture.detectChanges();
		button(el, "Sign in").click();
		await fixture.whenStable();
		expect(auth.login).toHaveBeenCalledWith("alice", "long-password");
		expect(navigate).toHaveBeenCalledWith("/");
	});

	it("shows the server error and stays on the page", async () => {
		auth.login.mockRejectedValue(
			new HttpErrorResponse({ status: 401, error: { error: "Incorrect username or password" } }),
		);
		const { fixture, el } = await render();
		typeInto(el, 'input[formControlName="username"]', "alice");
		typeInto(el, 'input[formControlName="password"]', "wrong");
		fixture.detectChanges();
		button(el, "Sign in").click();
		await fixture.whenStable();
		fixture.detectChanges();
		expect(el.querySelector('[role="alert"]')?.textContent).toContain("Incorrect username or password");
		expect(navigate).not.toHaveBeenCalled();
	});
});
