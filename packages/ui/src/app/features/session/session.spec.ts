import { TestBed } from "@angular/core/testing";
import { ActivatedRoute, convertToParamMap, provideRouter } from "@angular/router";
import { type ApiMock, apiMock, sessionView } from "../../../testing/fixtures";
import { ApiService } from "../../core/api";
import { SessionComponent } from "./session";
import { POLL_MS } from "./session-state";

describe("SessionComponent", () => {
	let api: ApiMock;

	beforeEach(() => {
		vi.useFakeTimers();
		api = apiMock();
		TestBed.configureTestingModule({
			providers: [
				provideRouter([]),
				{ provide: ApiService, useValue: api },
				{ provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: "s1" }) } } },
			],
		});
	});

	afterEach(() => vi.useRealTimers());

	async function render() {
		const fixture = TestBed.createComponent(SessionComponent);
		await vi.advanceTimersByTimeAsync(0);
		await fixture.whenStable();
		const el = fixture.nativeElement as HTMLElement;
		const settle = async (ms = 0) => {
			await vi.advanceTimersByTimeAsync(ms);
			fixture.detectChanges();
		};
		return { fixture, el, settle };
	}

	const button = (el: HTMLElement, text: string) =>
		Array.from(el.querySelectorAll("button")).find((b) => b.textContent?.includes(text));

	it("shows the loading state then the form", async () => {
		api.get.mockResolvedValue(sessionView());
		const fixture = TestBed.createComponent(SessionComponent);
		expect((fixture.nativeElement as HTMLElement).textContent).toBe("");
		await vi.advanceTimersByTimeAsync(0);
		await fixture.whenStable();
		expect((fixture.nativeElement as HTMLElement).querySelector("h1")?.textContent).toBe("My session");
	});

	it("shows the outline, the questions and the progress counter", async () => {
		api.get.mockResolvedValue(sessionView());
		const { el } = await render();
		expect(Array.from(el.querySelectorAll(".outline-link")).map((b) => b.textContent?.trim())).toEqual([
			"Choice",
			"Free",
		]);
		expect(el.querySelectorAll("app-question")).toHaveLength(2);
		expect(el.querySelector(".outline")?.textContent).toContain("0 of 2 answered");
		expect(el.querySelector(".badge")?.textContent).toBe("Recommended");
	});

	it("shows a dedicated page when the session is not found", async () => {
		api.get.mockRejectedValue(new Error("404"));
		const { el } = await render();
		expect(el.querySelector("h1")?.textContent).toBe("Session not found");
		expect(el.querySelector("a")?.getAttribute("href")).toBe("/");
	});

	it("shows the questions and answers of an answered session read-only", async () => {
		api.get.mockResolvedValue(
			sessionView({
				status: "answered",
				answers: { choice: { selected: ["b"], text: "" }, free: { selected: [], text: "because" } },
			}),
		);
		const { el } = await render();
		expect(el.querySelector("h1")?.textContent).toBe("My session");
		expect(el.querySelectorAll(".past")).toHaveLength(2);
		const answers = Array.from(el.querySelectorAll(".past-answer")).map((a) => a.textContent?.trim());
		expect(answers).toEqual(["Option B", "because"]);
		expect(el.querySelector("textarea, input, button")).toBeNull();
		expect(el.querySelector("a")?.getAttribute("href")).toBe("/");
	});

	it("flags the unanswered questions", async () => {
		api.get.mockResolvedValue(sessionView({ status: "answered", answers: {} }));
		const { el } = await render();
		expect(el.querySelectorAll(".past-answer")[0]?.textContent).toContain("No answer.");
	});

	it("shows the reason for the decline of a declined session, without answers", async () => {
		api.get.mockResolvedValue(sessionView({ status: "declined", declineReason: "off topic" }));
		const { el } = await render();
		expect(el.querySelector(".notice")?.textContent).toContain("off topic");
		expect(el.querySelector(".past-answer")).toBeNull();
		expect(el.querySelectorAll(".past")).toHaveLength(2);
	});

	it("keeps the submit button disabled while required answers are missing", async () => {
		api.get.mockResolvedValue(sessionView());
		const { el } = await render();
		expect(button(el, "Send")?.disabled).toBe(true);
		expect(el.textContent).toContain("2 required answer(s) missing");
	});

	it("sends the typed answers and shows the confirmation", async () => {
		api.get.mockResolvedValue(sessionView());
		const { el, settle } = await render();

		el.querySelector<HTMLInputElement>("input[type=radio]")!.click();
		// The choice question also offers an "Other" field (by default): the free-text question is the last one.
		const area = [...el.querySelectorAll<HTMLTextAreaElement>("textarea")].at(-1)!;
		area.value = "because";
		area.dispatchEvent(new Event("input"));
		await settle();

		const send = button(el, "Send")!;
		expect(send.disabled).toBe(false);
		send.click();
		await settle();

		expect(api.submit).toHaveBeenCalledWith("s1", {
			choice: { selected: ["a"], text: "", notes: {} },
			free: { selected: [], text: "because" },
		});
		expect(el.querySelector("h1")?.textContent).toBe("Answers sent");
	});

	it("shows the server error when submission fails", async () => {
		api.get.mockResolvedValue(sessionView({ questions: [sessionView().questions[1]!] }));
		api.submit.mockRejectedValue(new Error("network"));
		const { el, settle } = await render();
		const area = el.querySelector<HTMLTextAreaElement>("textarea")!;
		area.value = "x";
		area.dispatchEvent(new Event("input"));
		await settle();
		button(el, "Send")!.click();
		await settle();
		expect(el.querySelector("[role=alert]")?.textContent).toContain("Sending failed.");
	});

	describe("decline", () => {
		it("asks for a reason before sending the decline", async () => {
			api.get.mockResolvedValue(sessionView());
			const { el, settle } = await render();
			expect(el.querySelector("#reason")).toBeNull();

			button(el, "Decline")!.click();
			await settle();
			const reason = el.querySelector<HTMLTextAreaElement>("#reason")!;
			reason.value = "off topic";
			reason.dispatchEvent(new Event("input"));
			await settle();

			button(el, "Confirm decline")!.click();
			await settle();
			expect(api.decline).toHaveBeenCalledWith("s1", "off topic");
			expect(el.querySelector("h1")?.textContent).toBe("Decline sent");
		});

		it("allows cancelling the decline", async () => {
			api.get.mockResolvedValue(sessionView());
			const { el, settle } = await render();
			button(el, "Decline")!.click();
			await settle();
			button(el, "Cancel")!.click();
			await settle();
			expect(el.querySelector("#reason")).toBeNull();
			expect(button(el, "Decline")).toBeDefined();
		});
	});

	it("offers to display the questions modified by the agent, without imposing them", async () => {
		api.get.mockResolvedValue(sessionView());
		const { el, settle } = await render();
		expect(el.querySelector(".notice")).toBeNull();

		api.get.mockResolvedValue(sessionView({ revision: 1, title: "Changed title" }));
		await settle(POLL_MS);
		expect(el.querySelector(".notice")?.textContent).toContain("The agent changed the questions");
		expect(el.querySelector("h1")?.textContent).toBe("My session");
		expect(button(el, "Send")?.disabled).toBe(true);
		expect(el.textContent).toContain("Sending paused");
	});

	it("displays the modified questions when the user asks, then restores submission", async () => {
		api.get.mockResolvedValue(sessionView({ questions: [sessionView().questions[1]!] }));
		const { el, settle } = await render();
		const area = el.querySelector<HTMLTextAreaElement>("textarea")!;
		area.value = "ok";
		area.dispatchEvent(new Event("input"));
		await settle();
		expect(button(el, "Send")?.disabled).toBe(false);

		api.get.mockResolvedValue(
			sessionView({ revision: 1, title: "Changed title", questions: [sessionView().questions[1]!] }),
		);
		await settle(POLL_MS);
		expect(button(el, "Send")?.disabled).toBe(true);

		button(el, "Show the new questions")!.click();
		await settle();
		expect(el.querySelector("h1")?.textContent).toBe("Changed title");
		expect(el.querySelector<HTMLTextAreaElement>("textarea")?.value).toBe("ok");
		expect(el.querySelector(".notice")?.textContent).toContain("were kept");
		expect(button(el, "Send")?.disabled).toBe(false);
		expect(button(el, "Show the new questions")).toBeUndefined();
	});

	it("scrolls to the question from the outline", async () => {
		api.get.mockResolvedValue(sessionView());
		const { el, settle } = await render();
		const scrollIntoView = vi.fn();
		Element.prototype.scrollIntoView = scrollIntoView;
		vi.stubGlobal("matchMedia", () => ({ matches: false }));

		(el.querySelectorAll(".outline-link")[1] as HTMLButtonElement).click();
		await settle();
		expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
		vi.unstubAllGlobals();
	});
});
