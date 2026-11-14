import { Routes } from "@angular/router";
import { adminGuard, serverGuard } from "./core/auth";

// Each page is loaded on demand: one more feature = one more route, without growing the initial bundle.
export const routes: Routes = [
	{
		path: "",
		title: "Agent questions",
		loadComponent: () => import("./features/home/home").then((m) => m.HomeComponent),
	},
	{
		path: "s/:id",
		title: "Questions",
		loadComponent: () => import("./features/session/session").then((m) => m.SessionComponent),
	},
	{
		path: "login",
		title: "Sign in",
		loadComponent: () => import("./features/auth/login").then((m) => m.LoginComponent),
	},
	{
		path: "invite/:token",
		title: "Invitation",
		loadComponent: () => import("./features/auth/invite").then((m) => m.InviteComponent),
	},
	{
		path: "account",
		title: "My account",
		canActivate: [serverGuard],
		loadComponent: () => import("./features/account/account").then((m) => m.AccountComponent),
	},
	{
		// `canMatch`, not `canActivate`: for a non-admin (or the local profile) the route does not match, so the
		// administration chunk is never downloaded and the visitor is sent back to the home page.
		path: "admin",
		canMatch: [adminGuard],
		loadChildren: () => import("./features/admin/admin.routes").then((m) => m.ADMIN_ROUTES),
	},
	{ path: "**", redirectTo: "" },
];
