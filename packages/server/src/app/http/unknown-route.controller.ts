import { Public } from "@nestjs/authentication";
import { All, Controller } from "@nestjs/common";
import { HttpError } from "./http-error.js";

/** Routes kept outside the global prefix (`setGlobalPrefix({ exclude })`): the OAuth discovery probes of MCP clients. */
export const WELL_KNOWN_ROUTES = [".well-known", ".well-known/*"];

/**
 * Unknown route under `/api` (and `/.well-known`): JSON 404 response. `@nestjs/serve-static` returns the UI page for
 * any path that neither a file nor a controller serves (that is Angular's routing), which would mislead an API client:
 * an MCP client probing `/.well-known/…` would receive HTML. `@Public()`: without it, the authentication guard would
 * answer 401 (with `WWW-Authenticate`) and start OAuth discovery on the client. Real routes, being more specific, take
 * precedence over this one.
 */
@Controller()
export class UnknownRouteController {
	@Public()
	@All(["*", ...WELL_KNOWN_ROUTES])
	notFound(): never {
		throw new HttpError(404, "Route not found");
	}
}
