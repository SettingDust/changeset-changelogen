#! /usr/bin/env node
import { default as getChangesets } from '@changesets/read';
import writeChangeset from '@changesets/write';
import { getPackagesSync } from '@manypkg/get-packages';
import { loadChangelogConfig, parseCommits } from 'changelogen';
import consola from 'consola';
import fs from 'fs';
import path from 'path';
import {
  commitsToChangesets,
  difference,
  getCommitsSinceRef,
  getGitDiff,
  groupTheCommitsWithoutSemver,
} from './utils/index.js';

const CHANGESET_CONFIG_LOCATION = path.join('.changeset', 'config.json');
export default async (
  cwd: string = process.cwd(),
  options: { ignoredFiles: (string | RegExp)[] } = { ignoredFiles: [] },
) => {
  const packages = getPackagesSync(cwd).packages.filter(
    (pkg) => !pkg.packageJson.private && Boolean(pkg.packageJson.version),
  );
  const changesetConfig = JSON.parse(fs.readFileSync(path.join(cwd, CHANGESET_CONFIG_LOCATION)).toString());
  const { baseBranch = 'main' } = changesetConfig;
  const changelogenConfig = await loadChangelogConfig(cwd);

  changelogenConfig.from = getCommitsSinceRef(baseBranch);

  consola.info(`Generating changelog for ${changelogenConfig.from || ''}...${changelogenConfig.to}`);

  const rawCommits = await getGitDiff(changelogenConfig.from, changelogenConfig.to);

  const commits = parseCommits(rawCommits, changelogenConfig).filter(
    (c) =>
      changelogenConfig.types[c.type] &&
      !(c.type === 'chore' && (c.scope === 'deps' || c.scope === 'changeset') && !c.isBreaking),
  );

  const changesets = commitsToChangesets(groupTheCommitsWithoutSemver(commits, changelogenConfig), {
    ignoredFiles: options.ignoredFiles,
    packages,
    changelogen: changelogenConfig,
  });

  const currentChangesets = await getChangesets(cwd);

  const newChangesets = currentChangesets.length === 0 ? changesets : difference(changesets, currentChangesets);

  newChangesets.forEach((changeset) => writeChangeset(changeset, cwd));
};
