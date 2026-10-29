# Contributing

Thanks for helping make Super Mormon better! Bug reports, ideas, and pull requests are welcome.

## Run locally

Use Node.js 22 and npm. Fork and clone the repository, then run:

```sh
npm ci
npm run dev
```

Open [localhost:5173](http://127.0.0.1:5173/).

## Send a change

Create a branch, keep the change focused, and open a pull request. Include what changed, how you checked it, and screenshots for visual changes. For larger ideas, open an issue first so we can discuss the direction.

Before submitting:

```sh
npm test
npm run build
npm run format:check
```

Coding agents must read [AGENTS.md](AGENTS.md) before making changes. It covers gameplay, scripture sources, collision, cameras, and visual checks.

See the [repository reference](docs/development/game-reference.md) for the code layout, [story notes](docs/stories/) for sources and adaptations, and [deployment notes](docs/development/deployment.md) for hosting. Maintainers should also read [release security](docs/development/release-security.md).

## License

Super Mormon uses the [MIT License](LICENSE). Contributions are welcome under the same license. Only submit code and assets you have permission to share; third-party dependencies retain their own licenses.
