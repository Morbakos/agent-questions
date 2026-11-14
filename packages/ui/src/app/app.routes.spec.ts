import { describe, expect, it } from "vitest";
import { ADMIN_ROUTES } from "./features/admin/admin.routes";
import { adminGuard } from "./core/auth";
import { routes } from "./app.routes";

describe("app routes", () => {
	const admin = routes.find((route) => route.path === "admin");

	it("mounts the administration as a lazy child module guarded by canMatch", () => {
		expect(admin?.loadChildren).toBeTypeOf("function");
		expect(admin?.canMatch).toEqual([adminGuard]);
		// `canMatch` is what keeps the chunk from being downloaded: no component is wired on the parent.
		expect(admin?.loadComponent).toBeUndefined();
		expect(admin?.canActivate).toBeUndefined();
	});

	it("no longer declares admin pages at the top level", () => {
		expect(routes.filter((route) => route.path?.startsWith("admin/"))).toEqual([]);
	});

	it("loads the admin routes lazily, each page being its own chunk", async () => {
		const loaded = await (admin?.loadChildren as () => Promise<typeof ADMIN_ROUTES>)();
		expect(loaded).toBe(ADMIN_ROUTES);
		expect(ADMIN_ROUTES.map((route) => route.path)).toEqual(["users", "sessions", "sessions/:id"]);
		expect(ADMIN_ROUTES.every((route) => typeof route.loadComponent === "function")).toBe(true);
	});
});
