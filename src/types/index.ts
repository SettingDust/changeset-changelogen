import { Changeset } from '@changesets/types';
import { Package } from '@manypkg/get-packages';

export type ChangesetConventionalCommit = Changeset & {
  packagesChanged: Package[];
};
