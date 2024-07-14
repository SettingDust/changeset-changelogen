import type { Changeset } from '@changesets/types';
import { Package } from '@manypkg/get-packages';
import { formatReference, getGitDiff, GitCommit, Reference, ResolvedChangelogConfig } from 'changelogen';
import { execSync } from 'child_process';
import path from 'path';
import { upperFirst } from 'scule';

export const getFilesChangedSince = (opts: { from: string; to: string }) => {
  return execSync(`git diff --name-only ${opts.from}~1...${opts.to}`).toString().trim().split('\n');
};

export const getRepoRoot = () => {
  return execSync('git rev-parse --show-toplevel').toString().trim().replace(/\n|\r/g, '');
};

export const commitsToChangesets = (
  commits: GitCommit[],
  options: { ignoredFiles?: (string | RegExp)[]; packages: Package[]; changelogen: ResolvedChangelogConfig },
) => {
  const { ignoredFiles = [], packages } = options;
  return commits
    .map((commit) => {
      const filesChanged = getFilesChangedSince({
        from: commit.shortHash,
        to: commit.shortHash,
      })
        .filter((file) => {
          return ignoredFiles.every((ignoredPattern) => !file.match(ignoredPattern));
        })
        .map((file) => path.normalize(file));
      const packagesChanged = packages.filter((pkg) => {
        return filesChanged.some((file) => file.startsWith(pkg.relativeDir));
      });
      if (packagesChanged.length === 0) return null;
      return {
        releases: packagesChanged.map((pkg) => {
          let semver = options.changelogen.types[commit.type].semver;
          if (commit.isBreaking) semver = 'major';
          return {
            name: pkg.packageJson.name,
            type: semver,
          };
        }),
        summary: formatCommit(commit, options.changelogen),
        packagesChanged,
      };
    })
    .filter(Boolean) as Changeset[];
};

export const gitFetch = (branch: string) => {
  execSync(`git fetch origin ${branch}`);
};

export const getCurrentBranch = () => {
  return execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
};

/**
 * This could be running on the main branch or on a branch that was created from the main branch.
 * If this is running on the main branch, we want to get all commits since the last release.
 * If this is running on a branch that was created from the main branch, we want to get all commits since the branch was created.
 */
export const getCommitsSinceRef = (branch: string) => {
  gitFetch(branch);
  const currentBranch = getCurrentBranch();
  let sinceRef = `origin/${branch}`;
  if (currentBranch === branch) {
    try {
      sinceRef = execSync('git describe --tags --abbrev=0').toString();
    } catch (e) {
      console.log(
        "No git tags found, using repo's first commit for automated change detection. Note: this may take a while.",
      );
      sinceRef = execSync('git rev-list --max-parents=0 HEAD').toString();
    }
  }

  sinceRef = sinceRef.trim();

  return getGitDiff(sinceRef);
};

const compareChangeSet = (a: Changeset, b: Changeset): boolean => {
  return a.summary.replace(/\n$/, '') === b.summary && JSON.stringify(a.releases) == JSON.stringify(b.releases);
};

export const difference = (a: Changeset[], b: Changeset[]): Changeset[] => {
  return a.filter((changeA) => !b.some((changeB) => compareChangeSet(changeA, changeB)));
};

/**
 * https://github.com/unjs/changelogen/blob/main/src/markdown.ts#L137-L166
 */
function formatCommit(commit: GitCommit, config: ResolvedChangelogConfig) {
  return (
    '- ' +
    (commit.scope ? `**${commit.scope.trim()}:** ` : '') +
    (commit.isBreaking ? '⚠️  ' : '') +
    upperFirst(commit.description) +
    formatReferences(commit.references, config)
  );
}

function formatReferences(references: Reference[], config: ResolvedChangelogConfig) {
  const pr = references.filter((ref) => ref.type === 'pull-request');
  const issue = references.filter((ref) => ref.type === 'issue');
  if (pr.length > 0 || issue.length > 0) {
    return ' (' + [...pr, ...issue].map((ref) => formatReference(ref, config.repo)).join(', ') + ')';
  }
  if (references.length > 0) {
    return ' (' + formatReference(references[0], config.repo) + ')';
  }
  return '';
}
