const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// apps/web usa React 18 y queda hoisteado a la raíz del monorepo. Con
// nodeModulesPaths apuntando también ahí, algunos paquetes (ej.
// @react-navigation/core) terminaban resolviendo esa copia en vez de los
// 19.x de apps/mobile, dando dos instancias de React en paralelo (React
// Navigation fallaba con "useContext of null" / "Invalid hook call").
// extraNodeModules no alcanza para forzar esto: solo actúa como último
// recurso cuando la resolución normal falla, y "react" sí se resuelve
// normalmente (a la copia equivocada). Hay que bloquear directamente esa
// ruta para que Metro caiga en la copia local.
const rootReactPath = escapeRegExp(path.resolve(workspaceRoot, 'node_modules/react'));
const rootReactDomPath = escapeRegExp(path.resolve(workspaceRoot, 'node_modules/react-dom'));

const config = {
  watchFolders: [workspaceRoot],
  resolver: {
    nodeModulesPaths: [
      path.resolve(projectRoot, 'node_modules'),
      path.resolve(workspaceRoot, 'node_modules'),
    ],
    blockList: [
      new RegExp(`^${rootReactPath}/.*`),
      new RegExp(`^${rootReactDomPath}/.*`),
    ],
  },
};

module.exports = mergeConfig(getDefaultConfig(projectRoot), config);
