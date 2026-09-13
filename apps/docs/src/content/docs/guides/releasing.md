---
title: Releasing
description: How Lafken versions and publishes its packages.
---

## Fixed Versioning

All 12 `@lafken/*` packages share a single version — there is no independent versioning per package. If `@lafken/main` is at `0.15.0`, so is `@lafken/api`, `@lafken/dynamo`, and every other package in the monorepo, whether or not a given package changed in that release.

This is a deliberate trade-off for a framework whose packages are designed to be used together and depend on each other through `workspace:*` (resolved to the concrete version at publish time) and peer dependencies: a single version number tells you unambiguously whether two `@lafken/*` packages were built to work together, with no compatibility matrix to consult.

The practical consequence: install matching versions across every `@lafken/*` package you use. A mix of versions is not a configuration Lafken is tested against.

## How Packages Are Published

Every release runs through the **🚀 Release** GitHub Actions workflow — nothing is published from a maintainer's machine, and the repository holds no long-lived npm token. Publishing authenticates with npm through [OIDC (trusted publishing)](https://docs.npmjs.com/trusted-publishers): the workflow's job identity is exchanged for a short-lived npm credential at publish time, scoped to that one run, and every published package carries build provenance you can verify back to the exact commit and workflow run it came from.

## Semantic Versioning

Lafken follows [semver](https://semver.org/), with the [CHANGELOG](https://github.com/Hero64/lafken/blob/main/CHANGELOG.md) as the record of what changed in each release, split into Minor and Patch changes (Major has not been used yet — the project is pre-1.0, so breaking changes currently ship as Minor bumps, called out explicitly in the entry).

:::caution
Pre-1.0 software: a Minor release can include a breaking change. Read the CHANGELOG entry before upgrading, not just the version number.
:::

---

For the maintainer's operational steps — preparing the changelog, dispatching the workflow, merging the release pull request — see [CONTRIBUTING.md](https://github.com/Hero64/lafken/blob/main/CONTRIBUTING.md#-releasing).
