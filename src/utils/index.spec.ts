import { describe, expect, it } from '@jest/globals';
import type { ChangesetConventionalCommit } from '../types/index.js';
import { difference, gitFetch } from '../utils/index.js';

describe('difference', () => {
  const changesets = [
    {
      releases: [
        { name: 'changeset-cc-test-01', type: 'minor' },
        { name: 'changeset-cc-test-02', type: 'minor' },
      ],
      summary: 'feat: add cli helper and flags',
      packagesChanged: [
        {
          dir: '/z/merge-requests/changeset-conventional-commits/packages/test-01',
          relativeDir: 'packages/test-01',
          packageJson: {},
        },
        {
          dir: '/z/merge-requests/changeset-conventional-commits/packages/test-02',
          relativeDir: 'packages/test-02',
          packageJson: {},
        },
      ],
    },
    {
      releases: [{ name: 'changeset-cc-test-01', type: 'minor' }],
      summary: 'docs(changeset-cc-test-01): add update #2 and #3',
      packagesChanged: [
        {
          dir: '/z/merge-requests/changeset-conventional-commits/packages/test-01',
          relativeDir: 'packages/test-01',
          packageJson: {},
        },
      ],
    },
  ] as ChangesetConventionalCommit[];

  const currentChangesets = [
    {
      releases: [
        { name: 'changeset-cc-test-01', type: 'minor' },
        { name: 'changeset-cc-test-02', type: 'minor' },
      ],
      summary: 'feat: add cli helper and flags',
      packagesChanged: [
        {
          dir: '/z/merge-requests/changeset-conventional-commits/packages/test-01',
          relativeDir: 'packages/test-01',
          packageJson: {},
        },
        {
          dir: '/z/merge-requests/changeset-conventional-commits/packages/test-02',
          relativeDir: 'packages/test-02',
          packageJson: {},
        },
      ],
    },
  ] as ChangesetConventionalCommit[];

  it('correctly detects equal changesets *without* trailing new line/line break within `summary`', () => {
    expect(difference(changesets, currentChangesets)).toEqual([changesets[1]]);
  });

  it('correctly detects equal changesets *with* trailing new line/line break within `summary`', () => {
    changesets[0].summary += '\n';
    expect(difference(changesets, currentChangesets)).toEqual([changesets[1]]);
  });
});

describe('git-fetch', () => {
  it('correctly fetches', () => {
    expect(() => gitFetch('master')).not.toThrow();
  });
});
