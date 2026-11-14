import { ChangeDetectionStrategy, Component, effect, inject } from "@angular/core";
import { RouterLink, RouterOutlet } from "@angular/router";
import { AuthService } from "./core/auth";
import { LiveService } from "./core/live";
import { ThemeService } from "./core/theme";

@Component({
	selector: "app-root",
	imports: [RouterOutlet, RouterLink],
	changeDetection: ChangeDetectionStrategy.OnPush,
	styleUrl: "./app.scss",
	template: `
		<header class="top">
			<a
				routerLink="/"
				class="brand"
				>Agent questions</a
			>
			<div class="side">
				<button
					type="button"
					class="btn quiet"
					[attr.aria-label]="'Theme: ' + theme.label() + ' (click to change)'"
					(click)="theme.next()">
					Theme: {{ theme.label() }}
				</button>
				@if (auth.isServer()) {
					<nav
						class="user"
						aria-label="Account">
						@if (auth.isAdmin()) {
							<a routerLink="/admin/sessions">Sessions</a>
							<a routerLink="/admin/users">Users</a>
						}
						<a routerLink="/account">{{ auth.me()?.username }}</a>
						<button
							type="button"
							class="btn quiet"
							(click)="auth.logout()">
							Sign out
						</button>
					</nav>
				}
			</div>
		</header>
		@if (live.offer(); as offer) {
			<div
				class="toast"
				role="status">
				<span
					>New questions: <strong>{{ offer.title }}</strong></span
				>
				<span class="toast-actions">
					<button
						type="button"
						class="btn primary"
						(click)="live.open()">
						Go there
					</button>
					<button
						type="button"
						class="btn quiet"
						(click)="live.dismiss()">
						Dismiss
					</button>
				</span>
			</div>
		}
		<router-outlet />
	`,
})
export class App {
	protected readonly live = inject(LiveService);
	protected readonly auth = inject(AuthService);
	protected readonly theme = inject(ThemeService);

	constructor() {
		void this.auth.load();
		// The event stream requires an identified user: it follows the identity (opened on sign-in, closed on sign-out).
		effect(() => {
			if (this.auth.me()) {
				this.live.start();
			} else {
				this.live.stop();
			}
		});
	}
}
