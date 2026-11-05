// Garantiza UNA sola copia de react y react-dom en el bundle de Metro (CYC-102).
//
// En el monorepo, apps/web usa React 18 y apps/mobile React 19; npm hoistea una
// de ellas a la raíz. Si Metro resuelve una copia distinta según quién importa
// (ej. @react-navigation/core), hay dos Reacts en paralelo y fallan los hooks
// («Invalid hook call», «useContext of null»).
//
// Dos defensas, que no dependen de qué versión quedó hoisteada:
//  1. resolveRequest: toda petición de `react` / `react-dom` (y subrutas) se
//     resuelve como si viniera de apps/mobile, sin importar quién la pida.
//  2. blockList: Metro no puede leer ninguna otra copia conocida.
// Y si apps/mobile no tiene React instalado, falla al arrancar con un mensaje
// claro en vez de caer en la copia de la web.
const fs = require('fs');
const path = require('path');

const PACKAGES = ['react', 'react-dom'];
const SINGLETON_REQUEST = /^(react|react-dom)(\/.*)?$/;

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Regex que acepta / y \ como separador, para que sirva también en Windows.
function pathPrefixRegExp(dir) {
  const source = escapeRegExp(path.resolve(dir)).replace(/\\\\|\//g, '[\\\\/]');
  return new RegExp(`^${source}[\\\\/].*`);
}

function realDirOf(dir) {
  try {
    return fs.realpathSync(dir);
  } catch {
    return null;
  }
}

function buildSingletons({ projectRoot, workspaceRoot, candidateRoots = [] }) {
  const mobileReact = realDirOf(path.join(projectRoot, 'node_modules', 'react')) ||
    realDirOf(path.join(workspaceRoot, 'node_modules', 'react'));
  if (!mobileReact) {
    throw new Error(
      'Metro: no se encontró React para apps/mobile. Corre «npm ci» en la raíz del repositorio.',
    );
  }
  const mobilePackage = require(path.join(projectRoot, 'package.json'));
  const declared = mobilePackage.dependencies?.react;
  const installed = require(path.join(mobileReact, 'package.json')).version;
  if (declared && /^\d/.test(declared) && declared !== installed) {
    throw new Error(
      `Metro: apps/mobile pide react ${declared} pero la copia que resolvería es ${installed} (${mobileReact}). ` +
        'Corre «npm ci» en la raíz del repositorio.',
    );
  }

  const roots = [projectRoot, workspaceRoot, ...candidateRoots].map(r => path.resolve(r));
  const blocked = [];
  for (const name of PACKAGES) {
    // La copia que se conserva: la de mobile; la hoisteada solo si mobile depende del paquete.
    const dependsOn = Boolean(mobilePackage.dependencies?.[name]);
    const keep = realDirOf(path.join(projectRoot, 'node_modules', name)) ||
      (dependsOn ? realDirOf(path.join(workspaceRoot, 'node_modules', name)) : null);
    for (const root of roots) {
      const dir = path.join(root, 'node_modules', name);
      const real = realDirOf(dir);
      // Se bloquea toda copia que no sea LA de mobile (por ruta real, por si es un enlace).
      if (real && real !== keep) {
        for (const d of new Set([dir, real])) blocked.push(pathPrefixRegExp(d));
      }
    }
  }

  const origin = path.join(projectRoot, 'package.json');
  const resolveRequest = (context, moduleName, platform) => {
    const ctx = SINGLETON_REQUEST.test(moduleName) ? { ...context, originModulePath: origin } : context;
    return context.resolveRequest(ctx, moduleName, platform);
  };

  return { blockList: blocked, resolveRequest, mobileReact };
}

module.exports = { buildSingletons, pathPrefixRegExp, SINGLETON_REQUEST };
