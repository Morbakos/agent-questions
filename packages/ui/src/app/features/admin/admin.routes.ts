import { Routes } from "@angular/router";

/**
 * Administration pages, mounted under `/admin` by `app.routes.ts` with `loadChildren`. This file (and the pages it
 * lists) is only fetched once an admin navigates there: the parent route is protected by `canMatch`, so for anyone
 * else, and for the local profile, nothing from this feature is ever downloaded.
 */
export const ADMIN_ROUTES: Routes = [
	{
		path: "users",
		title: "Users",
		loadComponent: () => import("./users").then((m) => m.UsersComponent),
	},
	{
		path: "sessions",
		title: "User sessions",
		loadComponent: () => import("./sessions").then((m) => m.AdminSessionsComponent),
	},
	{
		path: "sessions/:id",
		title: "User session",
		loadComponent: () => import("./session-detail").then((m) => m.AdminSessionDetailComponent),
	},
];
