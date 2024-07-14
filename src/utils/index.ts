import type { Changeset } from '@changesets/types';
import { Package } from '@manypkg/get-packages';
import { formatReference, GitCommit, RawGitCommit, Reference, ResolvedChangelogConfig } from 'changelogen';
import { execSync } from 'child_process';
import consola from 'consola';
import path from 'path';
import { upperFirst } from 'scule';

export const getFilesChangedSince = (opts: { from: string; to: string }) => {
  return execSync(`git diff --name-only ${opts.from}~1...${opts.to}`).toString().trim().split('\n');
};

export const getRepoRoot = () => {
  return execSync('git rev-parse --show-toplevel').toString().trim().replace(/\n|\r/g, '');
};

export const groupTheCommitsWithoutSemver = (commits: GitCommit[], config: ResolvedChangelogConfig) => {
  return commits.reduce((grouped, commit) => {
    if (!grouped.length) grouped.push([]);
    const lastGroup = grouped.at(-1)!;
    if (config.types[commit.type].semver || commit.isBreaking) {
      if (lastGroup.some((it) => config.types[it.type].semver || it.isBreaking)) grouped.push([commit]);
      else lastGroup.push(commit);
    } else {
      lastGroup.push(commit);
    }
    return grouped;
  }, [] as GitCommit[][]);
};

export const commitsToChangesets = (
  commits: GitCommit[][],
  options: { ignoredFiles?: (string | RegExp)[]; packages: Package[]; changelogen: ResolvedChangelogConfig },
) => {
  const { ignoredFiles = [], packages } = options;
  const root = getRepoRoot();
  return commits
    .map((commit) => {
      const commitWithSemver = commit.find((it) => options.changelogen.types[it.type].semver)!;
      const semver = commit.find((it) => it.isBreaking)
        ? 'major'
        : options.changelogen.types[commitWithSemver.type].semver;
      const filesChanged = getFilesChangedSince({
        from: commitWithSemver.shortHash,
        to: commitWithSemver.shortHash,
      })
        .filter((file) => {
          return ignoredFiles.every((ignoredPattern) => !file.match(ignoredPattern));
        })
        .map((file) => path.normalize(`${root}/${file}`));
      const packagesChanged = packages.filter((pkg) => {
        return filesChanged.some((file) => file.startsWith(pkg.dir));
      });
      if (packagesChanged.length === 0) return null;
      return {
        releases: semver
          ? packagesChanged.map((pkg) => {
              return {
                name: pkg.packageJson.name,
                type: semver,
              };
            })
          : [],
        summary: commit.map((it) => formatCommit(it, options.changelogen)).join('\n'),
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
      consola.log(
        "No git tags found, using repo's first commit for automated change detection. Note: this may take a while.",
      );
      sinceRef = execSync('git rev-list --max-parents=0 HEAD').toString();
    }
  }

  sinceRef = sinceRef.trim();

  return sinceRef;
};

const compareChangeSet = (a: Changeset, b: Changeset): boolean => {
  return (
    a.summary.replace(/\s/g, '') === b.summary.replace(/\s/g, '') &&
    JSON.stringify(a.releases) == JSON.stringify(b.releases)
  );
};

export const difference = (a: Changeset[], b: Changeset[]): Changeset[] => {
  return a.filter((changeA) => !b.some((changeB) => compareChangeSet(changeA, changeB)));
};

/**
 * https://github.com/unjs/changelogen/blob/main/src/markdown.ts#L137-L166
 */
function formatCommit(commit: GitCommit, config: ResolvedChangelogConfig) {
  return (
    `**${config.types[commit.type].title}${commit.scope ? `(${commit.scope.trim()})` : ''}**: ` +
    (commit.isBreaking ? '⚠️  ' : '') +
    upperFirst(commit.description) +
    formatReferences(commit.references, config) +
    (commit.body ? `\n${commit.body.replace('\n', '\n  ')}\n` : '')
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

/**
 * https://github.com/unjs/changelogen/blob/main/src/git.ts
 */
export async function getGitDiff(from: string | undefined, to = 'HEAD'): Promise<RawGitCommit[]> {
  // https://git-scm.com/docs/pretty-formats
  const r = execSync(`git --no-pager log ${from ? `${from}...` : ''}${to} --pretty="----%n%s|%h|%an|%ae%n%b"`);
  return r
    .toString()
    .trim()
    .split('----\n')
    .splice(1)
    .map((line) => {
      const [firstLine, ..._body] = line.split('\n');
      const [message, shortHash, authorName, authorEmail] = firstLine.split('|');
      const r: RawGitCommit = {
        message,
        shortHash,
        author: { name: authorName, email: authorEmail },
        body: _body.join('\n'),
      };
      return r;
    });
}
