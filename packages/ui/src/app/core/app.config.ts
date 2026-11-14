import { provideHttpClient, withFetch, withInterceptors } from "@angular/common/http";
import { ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners } from "@angular/core";
import { RouteReuseStrategy, provideRouter } from "@angular/router";
import { routes } from "../app.routes";
import { authInterceptor } from "./auth";
import { ParamsReuseStrategy } from "./params-reuse-strategy";

/** Root providers: lazy routes, per-params route reuse, `fetch`-based HTTP with the 401 interceptor, English locale. */
export const appConfig: ApplicationConfig = {
	providers: [
		provideBrowserGlobalErrorListeners(),
		provideRouter(routes),
		{ provide: RouteReuseStrategy, useClass: ParamsReuseStrategy },
		provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
		{ provide: LOCALE_ID, useValue: "en-US" },
	],
};
