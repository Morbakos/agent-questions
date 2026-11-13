# Using the UI

The UI is served by the same process as the MCP server, at `http://127.0.0.1:4317` by default (or `AQ_PUBLIC_URL`).

## Screens

| Address                 | Title                             | Who          | Purpose                                      |
| ----------------------- | --------------------------------- | ------------ | -------------------------------------------- |
| `/`                     | Pending questions                 | everyone     | Pending questions and history                |
| `/s/<session_id>`       | the session title                 | everyone     | Answer a session, or read a closed one       |
| `/login`                | Sign in                           | `server`     | Sign in                                      |
| `/invite/<token>`       | Welcome                           | `server`     | Choose a password from an invitation link    |
| `/account`              | My account                        | `server`     | Change password, manage API tokens           |
| `/admin/users`          | Users                             | admin        | Create, invite, promote, disable accounts    |
| `/admin/sessions`       | User sessions                     | admin        | Read-only view of everyone's sessions        |
| `/admin/sessions/<id>`  | User session                      | admin        | Read-only view of one session                |

The header shows the brand link "Agent questions" (back to the list). In the `server` profile it also shows, for
admins, "Sessions" and "Users", then your username (link to your account) and "Sign out". The
`local` profile has no login and no account pages.

## The list

"Pending questions" lists your pending sessions: title, number of questions and reception time. It refreshes every
5 seconds (and not while the tab is hidden). Click one to answer.

Below, "History" lists answered and declined sessions, newest first, 50 per page ("Load more" loads the next
page). Each entry says "answered" or "declined" and when.

## Answering a session

The page has an outline on the left ("Outline") and the form on the right.

- The outline lists each question by its `header` (or `id`), marks answered ones with a check, and shows
  "N of M answered". Click an entry to scroll to the question.
- Each question shows its prompt, then a collapsible "Context" block when the agent provided context (open by default).
  Prompts and context are markdown, sanitised before display.
- Choice questions show radio buttons (`single`) or checkboxes (`multi`). A "Recommended" badge marks the agent's
  suggestion; it is not preselected.
- Under each option you pick, "+ Add a note" opens an optional note field. The agent receives it with that
  option. Unpicking the option removes its note.
- "Other" is a free-text field for an answer that fits no option.
- "(optional)" marks optional questions.

Buttons:

- "Send to the agent" is enabled when every required question is answered. Next to it you may see
  "N required answer(s) missing".
- "Decline" opens a field "Why not answer? (optional)" and
  "Confirm decline" / "Cancel". The agent receives the refusal and your reason.

After sending, the page shows "Answers sent" or "Decline sent". You can close the tab.

If the server rejects the answers (for example because a question changed), the error shows under the buttons, with
the list of problems.

### Drafts

Everything you type is saved as a draft 600 ms after your last keystroke, and again when you leave the page. The footer
shows "Draft saved at HH:mm". If it shows "Draft not saved" in red, the save failed (server
unreachable): the final send is still possible. Reopen the same session later and the form is restored.

### When the agent edits the questions

If the agent calls `update_questions`, the open page notices within 5 seconds (polling; no push). It does not replace
the form while you type. Instead a banner appears:

> The agent changed the questions. Sending is paused until you display the new version.

with the button "Show the new questions". Sending stays disabled until you click it,
because the server validates your answers against the up-to-date questions. On click, the form shows the new version and
keeps your answers for questions whose `id` is unchanged (and options that still exist, with their notes). A notice then
says your answers were kept "where possible".

### Read-only closed sessions

Opening an answered or declined session (from "History" or by its URL) shows it read-only: the prompts, and for each
question the options you picked, their notes and your free text ("No answer." when empty). A declined session shows
"You declined to answer" with your reason. A session that does not exist or is not yours shows "Session
not found".

## One tab that follows the agent

When the agent creates a session, the server tries to get you to the form without piling up tabs.

- The UI keeps a live connection to the server (`GET /api/events`). The server opens the browser only if no UI of yours
  is connected (or one was opened less than 15 seconds ago). So there is one tab. It never opens a browser with
  `AQ_NO_OPEN=1`, in Docker, or in the `server` profile.
- If the tab is on the list, on a "sent" confirmation, or on a closed session, it goes straight to the new questions.
- If you are filling in another form, a notification appears: "New questions: <title>" with "Go there" and
  "Dismiss". Your input is not interrupted, and it is saved in the draft anyway.
- If the tab is in the background, a site cannot bring itself to the foreground. The tab title becomes
  "(1) Agent questions" until you come back to it.
- The connection reconnects by itself (retry delay from 2 s up to 60 s). It works with `AQ_NO_OPEN=1`: keep a tab open on
  the list and it follows the agent. Updates made by `update_questions` do not use this channel: only the page showing that
  session notices them.

Only your own tabs are notified; in the `server` profile one user's questions never reach another user's tabs.

## Accessibility notes

The form uses labelled groups, `aria-required`, status regions for banners and errors, and respects
`prefers-reduced-motion` when scrolling to a question.
