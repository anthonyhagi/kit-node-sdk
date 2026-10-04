# Contributing to kit-node-sdk

Thank you for your interest in contributing to the kit-node-sdk project! We welcome contributions from the community, including bug reports, feature requests, and pull requests.

## Reporting Issues

If you encounter a bug or have a feature request, please open an issue on the [issues page](https://github.com/anthonyhagi/kit-node-sdk/issues). When reporting a bug, include:

- A clear description of the issue.
- Steps to reproduce the problem.
- Expected behavior.
- Any relevant error messages or logs.

For feature requests, please describe the proposed feature and its potential benefits to the project.

## Submitting Pull Requests

To contribute code or documentation-changes, please follow these steps:

1. Fork the repository.
2. Create a new branch for your changes.
3. Make your changes and commit them.
4. Push your branch to your fork.
5. Open a pull request from your branch to the main branch.

## Coding Standards

See the [development guide](docs/development.md) for setup instructions, scripts,
and testing examples. User-facing documentation lives in `docs/`; keep the root
README focused on installation, a quick start, and links to the guides.

Before submitting a pull request, please ensure that your code is linted and formatted correctly for the entire project. Run the following commands:

- `npm run lint` to check for linting errors.
- `npm run format` to format the code with Prettier.

**Note**: If your project uses different script names for linting and formatting, replace `npm run lint` and `npm run format` with the appropriate commands from your `package.json`.

## Dependency updates

Renovate manages dependency updates through `renovate.json`. Routine updates
run on Mondays between 03:00 and 07:00 Australia/Adelaide time, with at most five
open update PRs. npm patch updates are grouped separately from minor updates.
Routine npm releases wait three days before a PR is opened. Major upgrades
require approval in the Dependency Dashboard and manual PR review; minor
updates also require manual review.

Patch updates, action digest pins, and weekly lockfile maintenance can merge
after CI passes. Renovate performs the merge itself because GitHub automerge is
disabled. Development Node and `@types/node` stay on version 24; changes to the
SDK's supported Node versions in `package.json` are made manually.

Dependabot version updates are not configured, and its automatic security
updates are disabled in repository settings. Keep GitHub vulnerability alerts
enabled so Renovate can open security-fix PRs, including fixes for transitive
dependencies. Security fixes bypass the routine schedule and release-age delay
and require manual review.

## License and Agreement

This project is licensed under the MIT License. By contributing to this project, you agree that your contributions will be licensed under the MIT License and that you have read and understood the guidelines outlined in this CONTRIBUTING file.

## Questions?

If you have any questions or need assistance, feel free to reach out to the project maintainers by opening an issue or contacting us directly.
