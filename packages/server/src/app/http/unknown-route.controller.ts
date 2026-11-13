import { Public } from "@nestjs/authentication";
import { All, Controller } from "@nestjs/common";
import { HttpError } from "./http-error.js";

/**
 * Unknown route under a reserved prefix: JSON 404 response. `@nestjs/serve-static` returns the UI page for any path
 * that neither a file nor a controller serves (that is Angular's routing), which would mislead an API client: an MCP
 * client probing `/.well-known/…` would receive HTML. `@Public()`: without it, the authentication guard would answer
 * 401 (with `WWW-Authenticate`) and start OAuth discovery on the client. Real routes, being more specific, take
 * precedence over this one. `/sse` and `/messages` are the endpoints of the legacy HTTP+SSE transport, which is not
 * supported: a client falling back to it must get a JSON 404, not the UI page.
 */
@Controller()
export class UnknownRouteController {
	@Public()
	@All([
		"api",
		"api/*",
		"auth",
		"auth/*",
		"mcp/*",
		".well-known",
		".well-known/*",
		"sse",
		"sse/*",
		"messages",
		"messages/*",
	])
	notFound(): never {
		throw new HttpError(404, "Route not found");
	}
}
