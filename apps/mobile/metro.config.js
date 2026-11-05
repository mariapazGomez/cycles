const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const { buildSingletons } = require('./metroSingletons');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

// Una sola copia de react / react-dom (CYC-102). Ver metroSingletons.js.
const { blockList, resolveRequest } = buildSingletons({
  projectRoot,
  workspaceRoot,
  candidateRoots: [path.resolve(workspaceRoot, 'apps/web')],
});

const config = {
  watchFolders: [workspaceRoot],
  resolver: {
    nodeModulesPaths: [
      path.resolve(projectRoot, 'node_modules'),
      path.resolve(workspaceRoot, 'node_modules'),
    ],
    blockList,
    resolveRequest,
  },
};

module.exports = mergeConfig(getDefaultConfig(projectRoot), config);
