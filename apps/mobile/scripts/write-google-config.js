#!/usr/bin/env node
// Prepara el inicio de sesión con Google al compilar, sin guardar el ID de cliente
// en el repositorio: lo toma de la variable de entorno GOOGLE_IOS_CLIENT_ID y
//   1. lo escribe en src/config/google.ts (lo lee la app), y
//   2. registra en Info.plist el esquema de URL inverso con el que Google devuelve
//      a la persona a la app (com.googleusercontent.apps.<número>-<código>).
// Sin la variable no cambia nada y el botón de Google queda oculto.
// Nunca imprime el valor.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const CLIENT_ID_PATTERN = /^[0-9]+-[a-z0-9]+\.apps\.googleusercontent\.com$/;

function isValidClientId(id) {
  return typeof id === 'string' && CLIENT_ID_PATTERN.test(id);
}

// 834971199177-abc.apps.googleusercontent.com → com.googleusercontent.apps.834971199177-abc
function reversedScheme(id) {
  return (
    'com.googleusercontent.apps.' +
    id.replace(/\.apps\.googleusercontent\.com$/, '')
  );
}

function configSource(id) {
  return [
    '// Generado por scripts/write-google-config.js al compilar. No se sube al repositorio.',
    `export const GOOGLE_IOS_CLIENT_ID = '${id}';`,
    '',
  ].join('\n');
}

const PLIST_SCRIPT = `
import plistlib, sys
path, scheme = sys.argv[1], sys.argv[2]
with open(path, 'rb') as f:
    data = plistlib.load(f)
types = [t for t in data.get('CFBundleURLTypes', []) if scheme not in t.get('CFBundleURLSchemes', [])]
types.append({'CFBundleURLName': 'google-sign-in', 'CFBundleURLSchemes': [scheme]})
data['CFBundleURLTypes'] = types
with open(path, 'wb') as f:
    plistlib.dump(data, f, sort_keys=False)
`;

function run(env = process.env) {
  const id = (env.GOOGLE_IOS_CLIENT_ID || '').trim();
  if (!id) {
    console.log(
      'Google: sin GOOGLE_IOS_CLIENT_ID; el botón de Google queda oculto.',
    );
    return 0;
  }
  if (!isValidClientId(id)) {
    console.error(
      'Google: GOOGLE_IOS_CLIENT_ID no tiene el formato de un ID de cliente de iOS (<número>-<código>.apps.googleusercontent.com).',
    );
    return 1;
  }
  const root = path.join(__dirname, '..');
  fs.writeFileSync(
    path.join(root, 'src', 'config', 'google.ts'),
    configSource(id),
  );
  execFileSync('python3', [
    '-I',
    '-c',
    PLIST_SCRIPT,
    path.join(root, 'ios', 'CyclesMobile', 'Info.plist'),
    reversedScheme(id),
  ]);
  console.log('Google: ID de cliente configurado.');
  return 0;
}

if (require.main === module) {
  process.exit(run());
}

module.exports = { isValidClientId, reversedScheme, configSource, run };
