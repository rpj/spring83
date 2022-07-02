We'll keep it simple: don't be a dick, and you're good.

#### What to do before submitting a PR:
1. Lint your code with `npm run lint`.
2. If your code adds any functional units, please try to add tests for them.
3. Test the code with `npm test`.
4. Test `serve` end-to-end at least at the surface-level: make sure it runs, PUT a board, GET that board.
5. If you moved _anything_, test Docker deployment.
6. Use [conventional format](https://www.conventionalcommits.org/en/v1.0.0/) for your commit messages.
7. Submit a PR; review will be required.

Merge commits are _not_ allowed to `main`.

If pushing a release, use `npm run release` and not `npm version` or manually.