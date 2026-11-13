import type { Question, SessionSummary, SessionView } from "@agent-questions/shared";
import { ApiService } from "../app/core/api";

export const singleQuestion = (overrides: Partial<Question> = {}): Question => ({
	id: "choice",
	header: "Choice",
	prompt: "Which one to **choose**?",
	type: "single",
	options: [
		{ id: "a", label: "Option A", description: "The first", recommended: true },
		{ id: "b", label: "Option B" },
	],
	...overrides,
});

export const multiQuestion = (overrides: Partial<Question> = {}): Question => ({
	id: "multi",
	prompt: "Which ones?",
	type: "multi",
	options: [
		{ id: "x", label: "X" },
		{ id: "y", label: "Y" },
	],
	...overrides,
});

export const textQuestion = (overrides: Partial<Question> = {}): Question => ({
	id: "free",
	header: "Free",
	prompt: "Why?",
	type: "text",
	...overrides,
});

export const sessionView = (overrides: Partial<SessionView> = {}): SessionView => ({
	id: "s1",
	title: "My session",
	status: "pending",
	revision: 0,
	questions: [singleQuestion(), textQuestion()],
	draft: {},
	answers: null,
	declineReason: null,
	...overrides,
});

export const sessionSummary = (overrides: Partial<SessionSummary> = {}): SessionSummary => ({
	id: "s1",
	title: "My session",
	status: "pending",
	createdAt: new Date(2026, 9, 28, 14, 30).getTime(),
	answeredAt: null,
	questionCount: 2,
	...overrides,
});

/** Test double of `ApiService`: each method is a `vi.fn()` configurable per test. */
export function apiMock() {
	return {
		list: vi.fn<ApiService["list"]>(),
		history: vi.fn<ApiService["history"]>().mockResolvedValue({ items: [], nextBefore: null }),
		get: vi.fn<ApiService["get"]>(),
		saveDraft: vi.fn<ApiService["saveDraft"]>().mockResolvedValue({}),
		submit: vi.fn<ApiService["submit"]>().mockResolvedValue({}),
		decline: vi.fn<ApiService["decline"]>().mockResolvedValue({}),
	};
}

export type ApiMock = ReturnType<typeof apiMock>;
