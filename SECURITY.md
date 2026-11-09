# Security policy

## Supported versions

The project is in early development (0.1.x). Only the latest released version receives security fixes.

| Version | Supported |
| ------- | --------- |
| 0.1.x   | Latest only |
| Older   | No        |

## Reporting a vulnerability

Report vulnerabilities **privately** through GitHub's private vulnerability reporting: open the
[Security tab](https://github.com/Morbakos/agent-questions/security/advisories/new) of the repository and choose
"Report a vulnerability". Only the maintainers can read the report until a fix is published.
Include the affected version, the deployment profile (`local` or `server`), reproduction steps and the impact you see.
Never include real credentials, tokens or personal data.

Please do not open a public issue or pull request for a vulnerability.

This is a small project maintained on a best-effort basis. We aim to acknowledge a report within a few days and to
keep you informed, but we cannot promise fixed timelines.

## Scope

In scope: the server, the UI and the published package and Docker image, for instance authentication and session
handling, tenant isolation between users, token handling, the Host and Origin checks, and injection through
agent-supplied markdown.

Out of scope:

- Exposing the `local` profile beyond localhost: it has no authentication by design.
- Running the `server` profile without HTTPS and a reverse proxy as documented.
- Vulnerabilities in third-party dependencies with no demonstrated impact here (report them upstream).
- Denial of service by an authenticated user of a server you administer.

The threat model and the mechanisms in place are described in [docs/operations/security.md](docs/operations/security.md).
