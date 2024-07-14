/**
 * @param {import('@changesets/types').NewChangesetWithCommit} changeset
 * @param {import('@changesets/types').VersionType} _type
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const getReleaseLine = async (changeset, _type) => {
  const [firstLine, ...futureLines] = changeset.summary.split('\n');

  let returnVal = `- ${firstLine}`;

  if (futureLines.length > 0) {
    returnVal += `\n${futureLines.map((l) => `  ${l}`).join('\n')}`;
  }

  return returnVal;
};

/**
 *
 * @param {import('@changesets/types').NewChangesetWithCommit[]} changesets
 * @param {import('@changesets/types').ModCompWithPackage[]} dependenciesUpdated
 * @returns
 */
const getDependencyReleaseLine = async (changesets, dependenciesUpdated) => {
  if (dependenciesUpdated.length === 0) return '';

  const changesetLinks = changesets.map(
    (changeset) => `- Updated dependencies${changeset.commit ? ` [${changeset.commit.slice(0, 7)}]` : ''}`,
  );

  const updatedDependenciesList = dependenciesUpdated.map(
    (dependency) => `  - ${dependency.name}@${dependency.newVersion}`,
  );

  return [...changesetLinks, ...updatedDependenciesList].join('\n');
};

// eslint-disable-next-line no-undef
module.exports = {
  getReleaseLine,
  getDependencyReleaseLine,
};
