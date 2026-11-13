import { ComponentFixture, TestBed } from "@angular/core/testing";
import type { Answer, Question } from "@agent-questions/shared";
import { multiQuestion, singleQuestion, textQuestion } from "../../../testing/fixtures";
import { QuestionComponent } from "./question";

describe("QuestionComponent", () => {
	let fixture: ComponentFixture<QuestionComponent>;
	let emitted: Answer[];

	async function render(question: Question, answer: Answer = { selected: [], text: "" }) {
		fixture = TestBed.createComponent(QuestionComponent);
		emitted = [];
		fixture.componentInstance.changed.subscribe((a) => emitted.push(a));
		fixture.componentRef.setInput("question", question);
		fixture.componentRef.setInput("answer", answer);
		await fixture.whenStable();
	}

	const el = () => fixture.nativeElement as HTMLElement;
	const inputs = () => Array.from(el().querySelectorAll<HTMLInputElement>("input"));
	const click = async (node: HTMLElement) => {
		node.click();
		await fixture.whenStable();
	};

	it("names the option group and the text area after the question's prompt", async () => {
		await render(singleQuestion({ id: "choice" }));
		const group = el().querySelector('[role="group"]');
		expect(group?.getAttribute("aria-labelledby")).toBe("q-choice-prompt");
		expect(el().querySelector("#q-choice-prompt")).not.toBeNull();

		await render(textQuestion({ id: "free" }));
		expect(el().querySelector("textarea")?.getAttribute("aria-labelledby")).toBe("q-free-prompt");
	});

	it("says a question is optional, and marks the others as required", async () => {
		await render(singleQuestion({ required: false }));
		expect(el().textContent).toContain("(optional)");
		expect(el().querySelector('[role="group"]')?.getAttribute("aria-required")).toBe("false");

		await render(singleQuestion());
		expect(el().textContent).not.toContain("(optional)");
		expect(el().querySelector('[role="group"]')?.getAttribute("aria-required")).toBe("true");
	});

	it("shows the header and the prompt rendered as markdown", async () => {
		await render(singleQuestion());
		expect(el().querySelector(".q-head")?.textContent).toContain("Choice");
		expect(el().querySelector(".q-prompt strong")?.textContent).toBe("choose");
	});

	it("shows the context in a collapsible block when provided", async () => {
		await render(singleQuestion({ context_markdown: "```\ncode\n```" }));
		expect(el().querySelector("details.q-context pre")).not.toBeNull();
		await render(singleQuestion());
		expect(el().querySelector("details")).toBeNull();
	});

	describe("recommended choice", () => {
		it('shows a "Recommended" badge only on the recommended option', async () => {
			await render(singleQuestion());
			const labels = Array.from(el().querySelectorAll(".opt"));
			expect(labels).toHaveLength(2);
			expect(labels[0]?.querySelector(".badge")?.textContent).toBe("Recommended");
			expect(labels[1]?.querySelector(".badge")).toBeNull();
		});

		it("shows no badge without a recommended option", async () => {
			await render(
				singleQuestion({
					options: [
						{ id: "a", label: "A" },
						{ id: "b", label: "B" },
					],
				}),
			);
			expect(el().querySelector(".badge")).toBeNull();
		});

		it("does not preselect the recommended option", async () => {
			await render(singleQuestion());
			expect(inputs().every((i) => !i.checked)).toBe(true);
		});
	});

	describe("single choice", () => {
		it("renders radio buttons and shows the options' descriptions", async () => {
			await render(singleQuestion());
			expect(inputs().map((i) => i.type)).toEqual(["radio", "radio"]);
			expect(el().querySelector(".opt-desc")?.textContent).toBe("The first");
		});

		it('emits the chosen option and clears the "Other" text', async () => {
			await render(singleQuestion(), { selected: [], text: "previous" });
			await click(inputs()[1]!);
			expect(emitted).toEqual([{ selected: ["b"], text: "", notes: {} }]);
		});

		it("checks the option of the current answer", async () => {
			await render(singleQuestion(), { selected: ["b"], text: "" });
			expect(inputs().map((i) => i.checked)).toEqual([false, true]);
			expect(el().querySelector(".opt.on")).not.toBeNull();
		});
	});

	describe("multiple choice", () => {
		it("renders checkboxes", async () => {
			await render(multiQuestion());
			expect(inputs().map((i) => i.type)).toEqual(["checkbox", "checkbox"]);
		});

		it("adds then removes an option", async () => {
			await render(multiQuestion(), { selected: ["x"], text: "" });
			await click(inputs()[1]!);
			expect(emitted.at(-1)).toEqual({ selected: ["x", "y"], text: "" });
			await click(inputs()[0]!);
			expect(emitted.at(-1)).toEqual({ selected: [], text: "", notes: {} });
		});
	});

	describe("note per option", () => {
		const noteArea = () => el().querySelector<HTMLTextAreaElement>(".opt-note textarea");
		const noteButton = () => el().querySelector<HTMLButtonElement>(".opt-note button");

		it("appears only under a checked option, and only if allow_notes is not false", async () => {
			await render(multiQuestion(), { selected: ["x"], text: "" });
			expect(el().querySelectorAll(".opt-note")).toHaveLength(1);
			expect(noteButton()?.textContent).toContain("Add a note");

			await render(multiQuestion({ allow_notes: false }), { selected: ["x"], text: "" });
			expect(el().querySelector(".opt-note")).toBeNull();
		});

		it("opens the field on click and emits the typed note", async () => {
			await render(multiQuestion(), { selected: ["x"], text: "" });
			await click(noteButton()!);
			const area = noteArea()!;
			expect(area.getAttribute("aria-label")).toContain("Note on");
			area.value = "only for X";
			area.dispatchEvent(new Event("input"));
			await fixture.whenStable();
			expect(emitted.at(-1)).toEqual({ selected: ["x"], text: "", notes: { x: "only for X" } });
		});

		it("shows the field right away when a note exists", async () => {
			await render(multiQuestion(), { selected: ["x"], text: "", notes: { x: "already there" } });
			expect(noteArea()?.value).toBe("already there");
		});

		it("removes the note of an unchecked option", async () => {
			await render(multiQuestion(), { selected: ["x", "y"], text: "", notes: { x: "a", y: "b" } });
			await click(inputs()[0]!);
			expect(emitted.at(-1)).toEqual({ selected: ["y"], text: "", notes: { y: "b" } });
		});

		it("on single choice, changing option clears the note", async () => {
			await render(singleQuestion(), { selected: ["a"], text: "", notes: { a: "x" } });
			await click(inputs()[1]!);
			expect(emitted.at(-1)).toEqual({ selected: ["b"], text: "", notes: {} });
		});
	});

	describe('"Other" field', () => {
		const typeOther = async (value: string) => {
			const area = el().querySelector<HTMLTextAreaElement>(".other textarea")!;
			area.value = value;
			area.dispatchEvent(new Event("input"));
			await fixture.whenStable();
		};

		it("appears by default, unless allow_other is false", async () => {
			await render(singleQuestion());
			expect(el().querySelector(".other")).not.toBeNull();
			await render(singleQuestion({ allow_other: false }));
			expect(el().querySelector(".other")).toBeNull();
		});

		it("on single choice, typing text deselects the options", async () => {
			await render(singleQuestion({ allow_other: true }), { selected: ["a"], text: "" });
			await typeOther("something else");
			expect(emitted).toEqual([{ selected: [], text: "something else" }]);
		});

		it("on single choice, an empty text keeps the selection", async () => {
			await render(singleQuestion({ allow_other: true }), { selected: ["a"], text: "x" });
			await typeOther("  ");
			expect(emitted).toEqual([{ selected: ["a"], text: "  " }]);
		});

		it("on multiple choice, the text is added to the selection", async () => {
			await render(multiQuestion({ allow_other: true }), { selected: ["x"], text: "" });
			await typeOther("plus");
			expect(emitted).toEqual([{ selected: ["x"], text: "plus" }]);
		});
	});

	describe("free-text question", () => {
		it("renders a textarea with its placeholder, without options", async () => {
			await render(textQuestion({ placeholder: "Write…" }), { selected: [], text: "already" });
			const area = el().querySelector<HTMLTextAreaElement>("textarea")!;
			expect(area.placeholder).toBe("Write…");
			expect(area.value).toBe("already");
			expect(el().querySelector(".opts")).toBeNull();
		});

		it("emits the typed text", async () => {
			await render(textQuestion());
			const area = el().querySelector<HTMLTextAreaElement>("textarea")!;
			area.value = "answer";
			area.dispatchEvent(new Event("input"));
			expect(emitted).toEqual([{ selected: [], text: "answer" }]);
		});
	});

	it("exposes an anchor id for the page outline", async () => {
		await render(singleQuestion());
		expect(el().querySelector("section")?.id).toBe("q-choice");
	});
});
