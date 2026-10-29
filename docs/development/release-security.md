# Release security

A pull request can change or add workflows. An `if:` condition in a workflow is editable code, so repository settings must enforce the deployment boundary too.

## GitHub settings

- **Actions → General:** require approval for all outside contributors; default workflow permissions to read-only; leave “Allow GitHub Actions to create and approve pull requests” off. Review the complete diff before approving a run. The default permission is a baseline, not a ceiling on workflow-requested permissions.
- **Environments → github-pages:** allow deployments from the `main` branch only. Optionally require your approval for every deployment and disable administrator bypass if you want that enforced for everyone.
- **Rules → Rulesets / branch protection:** protect `main`, require pull requests and passing checks, block force pushes and deletion, and require owner review of workflow/build changes. Dismiss stale approvals after new commits. With only one maintainer, requiring another person’s review can block your own PRs; use a deliberate owner bypass or add a trusted reviewer.
- Add `CODEOWNERS` entries for `.github/` (including CODEOWNERS itself), `scripts/`, `package*.json`, and `vite.config.ts`. Require code-owner approval in the branch rules; the file alone does not enforce approval. Review all game code too: any merged change can affect the deployed game.

## Workflow rules

Use `pull_request` for untrusted checks on GitHub-hosted runners. Fork PRs normally receive a read-only token and no repository secrets. Do not enable write tokens or secrets for fork PRs, run public PRs on your own machine, or use `pull_request_target` to check out and execute PR code. Do not pass PR-built artifacts into a privileged deployment through `workflow_run`.

Keep PR checks read-only. Put asset retention (`contents: write`) in a separate job gated to a push/manual run on `main`; keep Pages/OIDC permissions only in deployment. Disable persisted checkout credentials in jobs that do not need to push. Pin third-party actions to reviewed full commit SHAs and review dependency updates.

## Repository snapshot · October 29, 2026

The workflow deploys only on a push to `main` or a manual run from `main`. The `github-pages` environment independently allows only the `main` branch, but permits administrator bypass and has no required reviewer. Using the owner account, Actions defaults to read-only and cannot create/approve pull requests, but outside-run approval covers only first-time contributors. The `main` branch has no classic protection and no rulesets.

The build job currently requests `contents: write` for asset retention, including PR checks. Normal fork token restrictions reduce that permission, but separating the privileged job is still recommended. These documentation changes do not change workflows or repository settings.

## Before calling this open source

Choose a license and check that code, art, fonts, audio, and other assets can be shared under the stated terms. The repository currently has no license; public visibility alone does not grant reuse permission.

Sources: [Actions settings](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository), [workflow events](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows), [environments](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments), [secure use](https://docs.github.com/en/actions/reference/security/secure-use), [code owners](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners).
