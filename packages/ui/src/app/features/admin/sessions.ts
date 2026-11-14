import { DatePipe } from "@angular/common";
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from "@angular/core";
import { RouterLink } from "@angular/router";
import type { AdminSessionSummary, Status } from "@agent-questions/shared";
import { ApiService } from "../../core/api";
import { errorMessage } from "../../core/errors";

const STATUS: Record<Status, string> = { pending: "Pending", answered: "Answered", declined: "Declined" };

/** Supervision: all sessions of all users, read-only (the admin does not answer in their place). */
@Component({
	selector: "app-admin-sessions",
	imports: [DatePipe, RouterLink],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<main class="page stack">
			<h1>User sessions</h1>
			<p class="muted">Read-only: only a session's owner can answer it.</p>
			@if (error(); as message) {
				<p
					class="error"
					role="alert">
					{{ message }}
				</p>
			}
			<div class="table-wrap">
				<table class="table">
					<thead>
						<tr>
							<th scope="col">Title</th>
							<th scope="col">Owner</th>
							<th scope="col">Status</th>
							<th scope="col">Created</th>
						</tr>
					</thead>
					<tbody>
						@for (session of sessions(); track session.id) {
							<tr>
								<th scope="row">
									<a [routerLink]="['/admin/sessions', session.id]">{{ session.title }}</a>
								</th>
								<td>{{ session.ownerUsername }}</td>
								<td>{{ label(session.status) }}</td>
								<td>{{ session.createdAt | date: "yyyy-MM-dd HH:mm" }}</td>
							</tr>
						} @empty {
							@if (loaded()) {
								<tr>
									<td colspan="4">No sessions.</td>
								</tr>
							}
						}
					</tbody>
				</table>
			</div>
			@if (next() !== null) {
				<button
					type="button"
					class="btn"
					[disabled]="busy()"
					(click)="more()">
					Show more
				</button>
			}
		</main>
	`,
})
export class AdminSessionsComponent implements OnInit {
	private readonly api = inject(ApiService);
	protected readonly sessions = signal<AdminSessionSummary[]>([]);
	protected readonly next = signal<string | null>(null);
	protected readonly error = signal<string | null>(null);
	protected readonly busy = signal(false);
	protected readonly loaded = signal(false);

	ngOnInit(): Promise<void> {
		return this.more();
	}

	protected label(status: Status): string {
		return STATUS[status];
	}

	protected async more(): Promise<void> {
		this.busy.set(true);
		this.error.set(null);
		try {
			const before = this.next() ?? undefined;
			const page = await this.api.adminSessions(before);
			this.sessions.update((current) => {
				const known = new Set(current.map((session) => session.id));
				return [...current, ...page.items.filter((session) => !known.has(session.id))];
			});
			this.next.set(page.nextBefore);
			this.loaded.set(true);
		} catch (error) {
			this.error.set(errorMessage(error));
		} finally {
			this.busy.set(false);
		}
	}
}
