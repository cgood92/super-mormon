# Release security

Every file is owned by [@cgood92](https://github.com/cgood92) through [CODEOWNERS](../../.github/CODEOWNERS). Review the full diff before approving a PR or an outside contributor’s workflow run; dependency, script, and game changes can all affect a release.

## Required review and checks

Two active rulesets protect `main`:

- **Protect main integrity:** the GitHub Actions `build` check must pass against current `main`; force pushes and deletion are blocked. Nobody has a bypass for these rules.
- **Owner review for every pull request:** require a PR, one code-owner approval, approval after the latest push, resolved conversations, and dismissal of stale approvals. This applies to every file, including CODEOWNERS itself.

GitHub does not allow authors to approve their own PRs. Only @cgood92 has a PR-only review bypass, intended for the owner’s own changes. GitHub technically permits that owner to bypass review on any PR; outside contributors cannot bypass it. The build and branch-integrity rules still apply. Do not use the bypass to skip reviewing outside submissions. Direct pushes to `main` are blocked even for the owner.

CODEOWNERS takes effect for incoming PRs after it is merged into the base branch. Repository administrators can still change repository settings; protect the owner account and grant repository access sparingly.

## Actions and deployment

- All outside contributors need workflow-run approval, not just first-time contributors. Default tokens are read-only, and Actions cannot create or approve PRs.
- Only GitHub-owned actions are allowed; all actions must use full commit SHAs. Dependabot proposes monthly npm and Actions updates, with vulnerability alerts and automated security-fix PRs enabled. Updates still need review and passing checks.
- PR checks use `pull_request`, GitHub-hosted runners, a read-only token, and no persisted checkout credentials. Fork PRs normally receive no repository secrets. Never introduce `pull_request_target` execution of PR code, self-hosted public-PR runners, or a privileged `workflow_run` consuming untrusted PR artifacts.
- `build` uploads a temporary artifact only for a main-branch push/manual run. The main-only `retain-assets` job downloads that same run’s artifact and has the write access needed for `pages-assets`. It runs no dependency installation. Keep the durable archive; never prune old game modules automatically.
- Only `deploy` gets Pages/OIDC permissions. The `github-pages` environment permits the `main` branch only and requires @cgood92’s approval for every release, with administrator bypass disabled. Self-review is allowed so the sole owner can approve their own deployments. A successful build waits for this approval before the game goes live.

An edited workflow’s `if:` conditions are not a security boundary by themselves. Repository rules, fork-token restrictions, and the protected deployment environment enforce the boundary independently. Merging approves code to run with trusted main-branch privileges.

## Licensing

The project uses the [MIT License](../../LICENSE). Check that contributed code, art, fonts, audio, and other assets can be redistributed under their stated terms; dependency and third-party notices still apply.

Settings above were applied and read back on October 29, 2026. Workflow and CODEOWNERS changes take effect when merged.

Sources: [Actions settings](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository), [workflow events](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows), [environments](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments), [secure use](https://docs.github.com/en/actions/reference/security/secure-use), [code owners](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners).
