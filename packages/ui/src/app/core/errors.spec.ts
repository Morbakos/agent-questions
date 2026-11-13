import { HttpErrorResponse } from "@angular/common/http";
import { errorMessage } from "./errors";

describe("errorMessage", () => {
	it("returns the API's text", () => {
		expect(errorMessage(new HttpErrorResponse({ status: 409, error: { error: "Already taken" } }))).toBe(
			"Already taken",
		);
	});

	it("adds the detail of the fields at fault", () => {
		const error = new HttpErrorResponse({ status: 400, error: { error: "Invalid request", details: ["a", "b"] } });
		expect(errorMessage(error)).toBe("Invalid request (a ; b)");
	});

	it("reports an unreachable server", () => {
		expect(errorMessage(new HttpErrorResponse({ status: 0 }))).toBe("Server unreachable.");
	});

	it("uses the fallback for an error without a body or that is not HTTP", () => {
		expect(errorMessage(new HttpErrorResponse({ status: 500 }), "Failed.")).toBe("Failed.");
		expect(errorMessage(new Error("x"), "Failed.")).toBe("Failed.");
		expect(errorMessage("text")).toBe("Something went wrong.");
	});
});
