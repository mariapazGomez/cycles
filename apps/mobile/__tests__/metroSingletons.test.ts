/* eslint-disable @typescript-eslint/no-require-imports */
// Módulos de Node vía require: la app móvil no trae los tipos de Node.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { buildSingletons } = require('../metroSingletons');
declare const __dirname: string;

function pkg(dir: string, name: string, version: string) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name, version }));
}

// Monorepo de mentira: mobile con React 19, la raíz (hoisteada por la web) con 18.
function fixture({ mobileReact = '19.2.3', rootReact = '18.3.1', declared = '19.2.3' } = {}) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'metro-')));
  const mobile = path.join(root, 'apps/mobile');
  fs.mkdirSync(mobile, { recursive: true });
  fs.writeFileSync(path.join(mobile, 'package.json'), JSON.stringify({ dependencies: { react: declared } }));
  if (mobileReact) pkg(path.join(mobile, 'node_modules/react'), 'react', mobileReact);
  if (rootReact) pkg(path.join(root, 'node_modules/react'), 'react', rootReact);
  pkg(path.join(root, 'node_modules/react-dom'), 'react-dom', '18.3.1');
  pkg(path.join(root, 'apps/web/node_modules/react'), 'react', '18.3.1');
  return { root, mobile };
}

const blocks = (list: RegExp[], file: string) => list.some(r => r.test(file));

test('bloquea las copias de React ajenas a mobile y deja pasar la de mobile', () => {
  const { root, mobile } = fixture();
  const { blockList } = buildSingletons({ projectRoot: mobile, workspaceRoot: root, candidateRoots: [path.join(root, 'apps/web')] });
  expect(blocks(blockList, path.join(root, 'node_modules/react/index.js'))).toBe(true);
  expect(blocks(blockList, path.join(root, 'apps/web/node_modules/react/index.js'))).toBe(true);
  expect(blocks(blockList, path.join(root, 'node_modules/react-dom/index.js'))).toBe(true);
  expect(blocks(blockList, path.join(mobile, 'node_modules/react/index.js'))).toBe(false);
});

test('si React 19 quedó hoisteado en la raíz, esa copia NO se bloquea', () => {
  const { root, mobile } = fixture({ mobileReact: '', rootReact: '19.2.3' });
  const { blockList } = buildSingletons({ projectRoot: mobile, workspaceRoot: root, candidateRoots: [path.join(root, 'apps/web')] });
  expect(blocks(blockList, path.join(root, 'node_modules/react/index.js'))).toBe(false);
  expect(blocks(blockList, path.join(root, 'apps/web/node_modules/react/index.js'))).toBe(true);
});

test('el bloqueo acepta los dos separadores de ruta (Windows)', () => {
  const { root, mobile } = fixture();
  const { blockList } = buildSingletons({ projectRoot: mobile, workspaceRoot: root });
  expect(blocks(blockList, path.join(root, 'node_modules/react/index.js').replace(/\//g, '\\'))).toBe(true);
});

test('react y react-dom (y subrutas) se resuelven siempre desde mobile', () => {
  const { root, mobile } = fixture();
  const { resolveRequest } = buildSingletons({ projectRoot: mobile, workspaceRoot: root });
  const inner = jest.fn(() => ({ type: 'sourceFile', filePath: 'x' }));
  const context = { originModulePath: '/otro/@react-navigation/core/lib/index.js', resolveRequest: inner };
  for (const request of ['react', 'react/jsx-runtime', 'react-dom']) {
    resolveRequest(context, request, 'ios');
  }
  inner.mock.calls.forEach(call => expect((call as unknown[])[0]).toMatchObject({ originModulePath: path.join(mobile, 'package.json') }));
  resolveRequest(context, 'react-native', 'ios');
  expect(inner).toHaveBeenLastCalledWith(context, 'react-native', 'ios');
  resolveRequest(context, 'reactive-thing', 'ios');
  expect(inner).toHaveBeenLastCalledWith(context, 'reactive-thing', 'ios');
});

test('falla con un mensaje claro si mobile no tiene React o la versión no coincide', () => {
  const sin = fixture({ mobileReact: '', rootReact: '' });
  expect(() => buildSingletons({ projectRoot: sin.mobile, workspaceRoot: sin.root })).toThrow(/npm ci/);
  const otra = fixture({ mobileReact: '19.0.0', declared: '19.2.3' });
  expect(() => buildSingletons({ projectRoot: otra.mobile, workspaceRoot: otra.root })).toThrow(/pide react 19\.2\.3/);
});

test('la configuración real de Metro bloquea la React 18 de la raíz', () => {
  const config = require('../metro.config.js');
  const rootReact = path.resolve(__dirname, '../../../node_modules/react/index.js');
  const mobileReact = path.resolve(__dirname, '../node_modules/react/index.js');
  if (!fs.existsSync(mobileReact)) return;
  const rootCopy = fs.realpathSync(path.dirname(rootReact));
  if (rootCopy !== fs.realpathSync(path.dirname(mobileReact))) {
    expect(blocks(config.resolver.blockList, rootReact)).toBe(true);
  }
  expect(blocks(config.resolver.blockList, mobileReact)).toBe(false);
});
