//  This script combines the core package json with each mods package.json.
//  **Note: The purpose of this file is stricly for development/build purposes.  
//  The generated core.package.json file will override upon commit.

import fs from 'fs';
import cp from 'child_process';
import * as objectHelpers from './utils/object-helpers.js';

import bundleConfig from './config.init.js';

const errorFactory = msg => Promise.reject(new Error(`::package-json-compose::Error:: ${msg}`));

const DEPENDENCY_TYPES = new Set(['dependencies', 'devDependencies', 'peerDependencies']);

const LEFT = 'LEFT';
const RIGHT = 'RIGHT';
const STRIP_NON_NUMERICS = /[^a-zA-Z0-9 ]/g;

const build = async ({
  packages,
  outputPackages
}) => {
  if (packages && objectHelpers.isEmpty(packages)) {
    return errorFactory('Missing required property dependencies');
  }

  if (typeof outputPackages !== 'object') {
    return errorFactory('Must provide output paths for desired package.json')
  }

  if (bundleConfig.PKG_DEP_TYPES && objectHelpers.isEmpty(bundleConfig.PKG_DEP_TYPES) ||
    objectHelpers.isEmpty(objectHelpers.pick(bundleConfig.PKG_DEP_TYPES, Array.from(DEPENDENCY_TYPES)))) {
    return errorFactory(`Must provide at least one of package.json dependency types: ${Array.from(DEPENDENCY_TYPES)}`);
  }

  const mappedPackges = Object.values(packages).map((value) => value);

  let packageData = [];
  for await (let url of mappedPackges) {
    await fs.promises.readFile(url).then((data) => {
      packageData.push(data);
    })
  }

  const parsedDependencies = await parse(packageData);
  const filteredDependencies = await filter(bundleConfig.PKG_BLK_LIST, parsedDependencies);
  const dedupedDependencies = await dedupe(bundleConfig.PKG_DEP_TYPES, filteredDependencies);

  //  console.log(`::package-json-compose::Generating\n${config.stringify(dedupedDependencies)}`);

  await compose(outputPackages, dedupedDependencies).then(() => {
    return Promise.resolve();
  });
}

const parse = async (data) => data.map((text) => {
  try {
    const result = JSON.parse(text);

    const {
      dependencies = {}, devDependencies = {}, peerDependencies = {}
    } = result;
    return {
      dependencies,
      devDependencies,
      peerDependencies
    };
  } catch (err) {
    console.log(err);
  }
});

const filter = async (blacklist, parsedDependencies) => {
  return parsedDependencies.map((packagedDependencies) => {
    return Object.keys(packagedDependencies).map((value) => value).reduce((result, m) => {
      result[m] = objectHelpers.omit(blacklist, packagedDependencies[m]);
      return result;
    }, {})
  });
};

const getTypes = (types) => {
  const isInTypes = (t) => {
    return DEPENDENCY_TYPES.has(t);
  };
  const isAllowed = (dependencyType) => {
    return !!types[dependencyType];
  };

  const test = Object.keys(types).map((key) => key).filter((type) => isAllowed(type)).filter((t) => isInTypes(t));

  return test;
};

const parseVersion = (str) => str.split('.').map(s => s.replace(STRIP_NON_NUMERICS, '')).map(s => parseInt(s, 10));

const getSemVer = (versionArr) => {
  const [major, minor, patch] = versionArr;
  return {
    major,
    minor,
    patch,
  };
};

const determineLargerVersion = (l, r) => {
  const leftSemVer = getSemVer(l);
  const rightSemVer = getSemVer(r);

  if (leftSemVer.major > rightSemVer.major) {
    return LEFT;
  } else if (rightSemVer.major > leftSemVer.major) {
    return RIGHT;
  }

  if (leftSemVer.minor > rightSemVer.minor) {
    return LEFT;
  } else if (rightSemVer.minor > leftSemVer.minor) {
    return RIGHT;
  }

  if (leftSemVer.patch > rightSemVer.patch) {
    return LEFT;
  }

  return RIGHT;
};

const dedupe = async (types, filteredDependencies) => {
  const allowedTypes = getTypes(types);

  const parseLatestVersion = (l, r) => {
    if (!l || !r) {
      return l ? l : r;
    }

    const leftVersion = parseVersion(l);
    const rightVersion = parseVersion(r);
    const higher = determineLargerVersion(leftVersion, rightVersion);

    if (higher === LEFT) {
      return l;
    }

    return r;
  };

  const getLatestVersion = (l, r) => {
    return objectHelpers.merge(parseLatestVersion, l, r);
  };

  return filteredDependencies.reduce((result, dependencies) => {
    const picked = objectHelpers.pick(dependencies, allowedTypes);
    // NOTE: if it already exists, take the latest one

    result = objectHelpers.merge(getLatestVersion, result, picked);

    return result;
  }, {});
};

const write = async (output, fileContents) => {
  await fs.promises.writeFile(output, bundleConfig.stringify(fileContents), 'utf-8')
    .then(() => {
      console.log("Linked package.json created at: " + output);
      return fileContents;
    });
}

//Non-destructive to all other package.json properties
const compose = async (outputs, fileContents) => {
  for await (let output of outputs) {
    await fs.promises.readFile(output)
      .then(async (data) => {
        let parsed;

        try {
          parsed = JSON.parse(data);
        } catch (e) {
          parsed = {};
        }

        const dupeKeys = (l, r) => r;
        const merged = objectHelpers.merge(dupeKeys, parsed, fileContents);

        await write(output, merged)
      })
  }
}

bundleConfig.init(async () => {
  const packages = {
    core: bundleConfig.LINK_CORE_PKG
  };

  const outputPackages = [
    bundleConfig.LINK_CORE_PKG
  ];

  // back up unbundled package files
  try {
    await fs.promises.access(bundleConfig.CORE_PKG_BKP);
    // Overwrite current core package.json with back up!
    await fs.promises.copyFile(bundleConfig.CORE_PKG_BKP, bundleConfig.LINK_CORE_PKG);
  } catch {
    // No current back up package.json recover, back up current core package.json
    await fs.promises.copyFile(bundleConfig.LINK_CORE_PKG, bundleConfig.CORE_PKG_BKP);
  }

  if (!bundleConfig.CORE_ONLY) {
    bundleConfig.ALL_MODULES.forEach(async (mod) => {
      packages[mod.APP_NAME] = mod.LINK_MOD_PKG;
      outputPackages.push(mod.LINK_MOD_PKG);

      try {
        await fs.promises.access(mod.MOD_PKG_BKP);
        // Overwrite module package.json with back up!
        await fs.promises.copyFile(mod.MOD_PKG_BKP, mod.LINK_MOD_PKG);
      } catch {
        // No module back up package.json to recover, back up current module package.json
        await fs.promises.copyFile(mod.LINK_MOD_PKG, mod.MOD_PKG_BKP);
      }
    });
  }

  return await build({
      packages,
      outputPackages
    }).then(() => {
      cp.exec("npm config set core_pkg_linked 1");
      console.log("Bundling linked packages complete");
      return 1;
    })
    .catch((err) => {
      console.log(err);
    });
});
