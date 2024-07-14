---
'changeset-changelogen': patch
---

**💅 Refactors(utils)**: Group commits without semver ([f5a54b3](https://github.com/SettingDust/changeset-changelogen/commit/f5a54b3))
Group the commits without a semver bump together and modify the changelogen
utilization to improve changeset generation. This provides a more structured
approach to handling commits that do not trigger a semver change, ensuring
that they are appropriately aggregated in the changelog.
