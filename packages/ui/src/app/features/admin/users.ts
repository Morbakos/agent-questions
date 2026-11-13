import { DatePipe } from "@angular/common";
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from "@angular/core";
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import type { Role, UserInvitation, UserSummary } from "@agent-questions/shared";
import { AccountsApi } from "../../core/accounts-api";
import { AuthService } from "../../core/auth";
import { errorMessage } from "../../core/errors";

/** Account administration: create, invite, disable, change role. Finer permissions come later. */
@Component({
	selector: "app-users",
	imports: [ReactiveFormsModule, DatePipe],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<main class="page stack">
			<h1>Users</h1>

			<section
				class="stack"
				aria-labelledby="new-title">
				<h2 id="new-title">Invite someone</h2>
				<form
					class="row"
					[formGroup]="form"
					(ngSubmit)="create()">
					<label class="stack tight grow">
						Username
						<input
							class="field"
							type="text"
							formControlName="username"
							autocomplete="off"
							autocapitalize="none"
							spellcheck="false"
							aria-describedby="username-rules" />
						<span
							id="username-rules"
							class="muted small">
							3 to 40 characters: letters, digits, dot, hyphen, underscore.
						</span>
					</label>
					<label class="stack tight">
						Role
						<select
							class="field"
							formControlName="role">
							<option value="member">Member</option>
							<option value="admin">Administrator</option>
						</select>
					</label>
					<button
						type="submit"
						class="btn primary"
						[disabled]="form.invalid || busy()">
						Create and invite
					</button>
				</form>
				@if (invitation(); as invite) {
					<div
						class="panel stack tight"
						role="status">
						<p>
							Invitation link for <strong>{{ invite.user.username }}</strong> (valid until
							{{ invite.expiresAt | date: "yyyy-MM-dd HH:mm" }}). Pass it on to them: it will not be shown
							again.
						</p>
						<code class="secret">{{ invite.inviteUrl }}</code>
					</div>
				}
				@if (error(); as message) {
					<p
						class="error"
						role="alert">
						{{ message }}
					</p>
				}
			</section>

			<section
				class="stack"
				aria-labelledby="list-title">
				<h2 id="list-title">Accounts</h2>
				<div class="table-wrap">
					<table class="table">
						<thead>
							<tr>
								<th scope="col">Username</th>
								<th scope="col">Role</th>
								<th scope="col">Status</th>
								<th scope="col">Created</th>
								<th scope="col"><span class="visually-hidden">Actions</span></th>
							</tr>
						</thead>
						<tbody>
							@for (user of users(); track user.id) {
								<tr>
									<th scope="row">{{ user.username }}</th>
									<td>{{ user.role === "admin" ? "Administrator" : "Member" }}</td>
									<td>{{ status(user) }}</td>
									<td>{{ user.createdAt | date: "yyyy-MM-dd" }}</td>
									<td>
										<div class="row actions">
											<button
												type="button"
												class="btn"
												[attr.aria-label]="'New link for ' + user.username"
												(click)="reinvite(user)">
												New link
											</button>
											<button
												type="button"
												class="btn"
												[attr.aria-label]="
													(user.role === 'admin' ? 'Demote ' : 'Promote ') + user.username
												"
												[disabled]="user.id === auth.me()?.userId"
												(click)="setRole(user, user.role === 'admin' ? 'member' : 'admin')">
												{{ user.role === "admin" ? "Demote" : "Promote" }}
											</button>
											<button
												type="button"
												class="btn"
												[class.danger]="!user.disabled"
												[attr.aria-label]="
													(user.disabled ? 'Enable ' : 'Disable ') + user.username
												"
												[disabled]="user.id === auth.me()?.userId && !user.disabled"
												(click)="user.disabled ? setDisabled(user, false) : askDisable(user)">
												{{ user.disabled ? "Enable" : "Disable" }}
											</button>
										</div>
										@if (confirming() === user.id) {
											<div
												class="panel stack tight"
												role="group"
												[attr.aria-label]="'Confirm disabling ' + user.username">
												<label class="row">
													<input
														type="checkbox"
														[checked]="revokeTokens()"
														(change)="revokeTokens.set(isChecked($event))" />
													Also delete their API tokens
												</label>
												<p class="muted small">
													Without this box, their tokens are rejected while the account is
													disabled, but work again once it is re-enabled.
												</p>
												<div class="row">
													<button
														type="button"
														class="btn danger"
														[disabled]="busy()"
														(click)="confirmDisable(user)">
														Confirm
													</button>
													<button
														type="button"
														class="btn"
														(click)="confirming.set(null)">
														Cancel
													</button>
												</div>
											</div>
										}
									</td>
								</tr>
							}
						</tbody>
					</table>
				</div>
			</section>
		</main>
	`,
})
export class UsersComponent implements OnInit {
	private readonly api = inject(AccountsApi);
	protected readonly auth = inject(AuthService);
	protected readonly form = inject(NonNullableFormBuilder).group({
		username: [
			"",
			[
				Validators.required,
				Validators.minLength(3),
				Validators.maxLength(40),
				Validators.pattern(/^[A-Za-z0-9][A-Za-z0-9._-]*$/),
			],
		],
		role: ["member" as Role],
	});
	protected readonly users = signal<UserSummary[]>([]);
	protected readonly invitation = signal<UserInvitation | null>(null);
	protected readonly error = signal<string | null>(null);
	protected readonly busy = signal(false);
	/** Account whose disabling awaits confirmation, or `null`. */
	protected readonly confirming = signal<string | null>(null);
	/** "Also delete their API tokens" checkbox of the current confirmation. */
	protected readonly revokeTokens = signal(true);

	async ngOnInit(): Promise<void> {
		await this.refresh();
	}

	protected status(user: UserSummary): string {
		if (user.disabled) {
			return "Disabled";
		}
		return user.pending ? "Invitation pending" : "Active";
	}

	private async refresh(): Promise<void> {
		try {
			this.users.set(await this.api.users());
		} catch (error) {
			this.error.set(errorMessage(error));
		}
	}

	/** Runs an admin action, then reloads the list; any error is displayed. */
	private async act(action: () => Promise<unknown>, fallback: string): Promise<boolean> {
		this.busy.set(true);
		this.error.set(null);
		try {
			await action();
			await this.refresh();
			return true;
		} catch (error) {
			this.error.set(errorMessage(error, fallback));
			return false;
		} finally {
			this.busy.set(false);
		}
	}

	protected async create(): Promise<void> {
		if (this.form.invalid) {
			return;
		}
		const { username, role } = this.form.getRawValue();
		this.invitation.set(null);
		const done = await this.act(
			async () => this.invitation.set(await this.api.createUser(username, role)),
			"Could not create the account.",
		);
		if (done) {
			this.form.reset({ username: "", role: "member" });
		}
	}

	protected async reinvite(user: UserSummary): Promise<void> {
		this.invitation.set(null);
		await this.act(
			async () => this.invitation.set(await this.api.reinvite(user.id)),
			"Could not create the invitation.",
		);
	}

	protected async setRole(user: UserSummary, role: Role): Promise<void> {
		await this.act(() => this.api.updateUser(user.id, { role }), "Could not change the role.");
	}

	protected async setDisabled(user: UserSummary, disabled: boolean): Promise<void> {
		await this.act(() => this.api.updateUser(user.id, { disabled }), "Could not update the account.");
	}

	/** Opens the disabling confirmation for this account (token deletion is checked by default). */
	protected askDisable(user: UserSummary): void {
		this.revokeTokens.set(true);
		this.confirming.set(user.id);
	}

	protected async confirmDisable({ id }: UserSummary): Promise<void> {
		const done = await this.act(
			() => this.api.updateUser(id, { disabled: true, revokeTokens: this.revokeTokens() }),
			"Could not update the account.",
		);
		if (done) {
			this.confirming.set(null);
		}
	}

	protected isChecked(event: Event): boolean {
		return (event.target as HTMLInputElement).checked;
	}
}
