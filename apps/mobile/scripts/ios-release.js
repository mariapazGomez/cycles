#!/usr/bin/env node
/* eslint-env node */
/* eslint-disable no-console */
// Validador y contador de compilaciones para publicar la app iOS.
//
//   node scripts/ios-release.js check [--sin-pruebas] [--desde-xcode]
//   node scripts/ios-release.js bump [--version X.Y.Z]
//   node scripts/ios-release.js registrar
//
// `check` corre antes de cada subida (a mano, con `npm run ios:check`, y
// automáticamente al archivar en Xcode) y falla si algo haría que Apple
// rechace la compilación. `bump` deja el número de compilación en uno que Apple
// aceptará. `registrar` anota una subida hecha, para que `check` sepa cuál fue
// la última. Ver docs/deploy/PUBLICAR-IOS.md.

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const IOS = path.join(ROOT, 'ios');
const PBX = path.join(IOS, 'CyclesMobile.xcodeproj', 'project.pbxproj');
const PLIST = path.join(IOS, 'CyclesMobile', 'Info.plist');
const RECORD = path.join(IOS, 'subidas.json');
const ICON_DIR = path.join(IOS, 'CyclesMobile', 'Images.xcassets', 'AppIcon.appiconset');
const ENV_TS = path.join(ROOT, 'src', 'config', 'env.ts');

const BUNDLE_ID = 'app.getcycles.mobile';
const PROD_URL = 'https://api.getcycles.app';
// Equipo gratuito ("Personal Team"): no puede distribuir por TestFlight.
const FREE_TEAM = 'Y6Z96XJBFW';
// Lo único que puede estar modificado al validar justo después de `bump`.
const BUMP_FILES = ['apps/mobile/ios/CyclesMobile.xcodeproj/project.pbxproj', 'apps/mobile/ios/subidas.json'];

// ---------- funciones puras (con tests) ----------

// Todos los valores de un ajuste del proyecto de Xcode (aparece una vez por
// configuración: Debug y Release).
function readSetting(pbx, key) {
  const re = new RegExp(`^\\s*${key} = ([^;]+);`, 'gm');
  const values = [];
  let match = re.exec(pbx);
  while (match) {
    values.push(match[1].trim().replace(/^"|"$/g, ''));
    match = re.exec(pbx);
  }
  return values;
}

function writeSetting(pbx, key, value) {
  return pbx.replace(new RegExp(`^(\\s*${key} = )[^;]+;`, 'gm'), `$1${value};`);
}

function parseVersion(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
}

function compareVersions(a, b) {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  for (let i = 0; i < 3; i += 1) {
    if (pa[i] !== pb[i]) {
      return pa[i] < pb[i] ? -1 : 1;
    }
  }
  return 0;
}

// Ancho, alto y transparencia de un PNG. Apple rechaza el ícono de 1024 px si
// tiene canal alfa.
function pngInfo(buffer) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (buffer.length < 33 || !buffer.subarray(0, 8).equals(signature)) {
    return null;
  }
  const colorType = buffer[25];
  let hasAlpha = colorType === 4 || colorType === 6;
  let offset = 8;
  while (offset + 8 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    if (type === 'tRNS') {
      hasAlpha = true;
    }
    if (type === 'IDAT') {
      break;
    }
    offset += 12 + length;
  }
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20), hasAlpha };
}

function lastUpload(record) {
  const uploads = record.subidas || [];
  return uploads.reduce(
    (acc, u) => ({
      build: Math.max(acc.build, u.compilacion),
      version: acc.version && compareVersions(acc.version, u.version) >= 0 ? acc.version : u.version,
    }),
    { build: 0, version: null },
  );
}

// Reglas de versión y compilación contra lo ya subido. Devuelve errores.
function checkVersioning({ versions, builds, record }) {
  const errors = [];
  if (new Set(versions).size !== 1 || new Set(builds).size !== 1) {
    errors.push('La versión o la compilación no coincide entre Debug y Release en el proyecto de Xcode.');
    return errors;
  }
  const version = versions[0];
  const build = Number(builds[0]);
  if (!parseVersion(version)) {
    errors.push(`La versión "${version}" debe tener el formato X.Y.Z (por ejemplo 1.0.0).`);
    return errors;
  }
  if (!Number.isInteger(build) || build < 1) {
    errors.push(`El número de compilación "${builds[0]}" debe ser un entero desde 1.`);
    return errors;
  }
  const last = lastUpload(record);
  if (last.version && compareVersions(version, last.version) < 0) {
    errors.push(`La versión ${version} es menor que la última subida (${last.version}). Apple no acepta bajar de versión.`);
  }
  if (build <= last.build) {
    errors.push(
      `La compilación ${build} ya se usó o es menor que la última subida (${last.build}). ` +
        `Apple la rechazaría. Corre "npm run ios:bump" para dejarla en ${last.build + 1}.`,
    );
  }
  return errors;
}

// ---------- validaciones con archivos y git ----------

const ok = message => ({ level: 'ok', message });
const warn = message => ({ level: 'warn', message });
const fail = message => ({ level: 'error', message });

function readRecord() {
  return fs.existsSync(RECORD) ? JSON.parse(fs.readFileSync(RECORD, 'utf8')) : { subidas: [] };
}

function git(args) {
  return execSync(`git ${args}`, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
}

function checkProject() {
  const results = [];
  const pbx = fs.readFileSync(PBX, 'utf8');
  const record = readRecord();

  // Versión y compilación
  const versions = readSetting(pbx, 'MARKETING_VERSION');
  const builds = readSetting(pbx, 'CURRENT_PROJECT_VERSION');
  const versionErrors = checkVersioning({ versions, builds, record });
  if (versionErrors.length === 0) {
    results.push(ok(`Versión ${versions[0]}, compilación ${builds[0]} (última subida: ${lastUpload(record).build || 'ninguna'})`));
  } else {
    versionErrors.forEach(e => results.push(fail(e)));
  }

  // Identificador y equipo de firma
  const bundleIds = readSetting(pbx, 'PRODUCT_BUNDLE_IDENTIFIER');
  if (bundleIds.length > 0 && bundleIds.every(id => id === BUNDLE_ID)) {
    results.push(ok(`Identificador ${BUNDLE_ID}`));
  } else {
    results.push(fail(`El identificador debe ser ${BUNDLE_ID} (hoy: ${bundleIds.join(', ') || 'ninguno'}).`));
  }
  const teams = readSetting(pbx, 'DEVELOPMENT_TEAM');
  if (teams.length === 0 || teams.some(t => !t)) {
    results.push(fail('Falta DEVELOPMENT_TEAM: el proyecto no tiene equipo de firma (tarea T-114).'));
  } else if (teams.includes(FREE_TEAM)) {
    results.push(fail(`El proyecto firma con el equipo gratuito ${FREE_TEAM}, que no puede subir a TestFlight. Cámbialo al de la cuenta de pago (tarea T-114).`));
  } else {
    results.push(ok(`Equipo de firma ${teams[0]}`));
  }

  // Solo iPhone
  const families = readSetting(pbx, 'TARGETED_DEVICE_FAMILY');
  if (families.length > 0 && families.every(f => f === '1')) {
    results.push(ok('Solo iPhone'));
  } else {
    results.push(fail('TARGETED_DEVICE_FAMILY debe ser 1 (solo iPhone); si declara iPad, Apple pide capturas de iPad.'));
  }

  // Info.plist
  const plist = fs.readFileSync(PLIST, 'utf8');
  if (/<key>ITSAppUsesNonExemptEncryption<\/key>\s*<false\/>/.test(plist)) {
    results.push(ok('Declaración de cifrado en el Info.plist'));
  } else {
    results.push(fail('Falta ITSAppUsesNonExemptEncryption = false en el Info.plist: App Store Connect bloquearía la compilación con una pregunta de cifrado.'));
  }
  const emptyUsage = [...plist.matchAll(/<key>(NS\w+UsageDescription)<\/key>\s*<string>\s*<\/string>/g)].map(m => m[1]);
  if (emptyUsage.length === 0) {
    results.push(ok('Sin permisos declarados vacíos'));
  } else {
    results.push(fail(`Permisos con el texto vacío en el Info.plist (Apple los rechaza): ${emptyUsage.join(', ')}.`));
  }

  // Ícono
  const iconPath = path.join(ICON_DIR, 'icon-1024.png');
  const contents = fs.existsSync(path.join(ICON_DIR, 'Contents.json')) ? fs.readFileSync(path.join(ICON_DIR, 'Contents.json'), 'utf8') : '';
  const info = fs.existsSync(iconPath) ? pngInfo(fs.readFileSync(iconPath)) : null;
  if (!info) {
    results.push(fail('Falta el ícono de 1024 px (icon-1024.png) o no es un PNG válido.'));
  } else if (info.width !== 1024 || info.height !== 1024) {
    results.push(fail(`El ícono debe medir 1024 × 1024 px (mide ${info.width} × ${info.height}).`));
  } else if (info.hasAlpha) {
    results.push(fail('El ícono de 1024 px tiene transparencia (canal alfa): Apple lo rechaza. Expórtalo sin transparencia.'));
  } else if (!contents.includes('icon-1024.png')) {
    results.push(fail('Contents.json del ícono no apunta a icon-1024.png.'));
  } else {
    results.push(ok('Ícono 1024 × 1024 sin transparencia'));
  }

  // API de producción
  const env = fs.readFileSync(ENV_TS, 'utf8');
  if (env.includes(PROD_URL) && env.includes('__DEV__')) {
    results.push(ok(`Las compilaciones Release usan ${PROD_URL}`));
  } else {
    results.push(fail(`src/config/env.ts debe usar ${PROD_URL} fuera de desarrollo (__DEV__).`));
  }

  return results;
}

function checkGit() {
  const results = [];
  try {
    // Sin recortar la salida: la primera columna puede ser un espacio.
    const dirty = git('status --porcelain')
      .split('\n')
      .filter(Boolean)
      .map(line => line.slice(3))
      .filter(file => !BUMP_FILES.includes(file));
    if (dirty.length === 0) {
      results.push(ok('Sin cambios sin commitear (salvo el contador)'));
    } else {
      results.push(fail(`Hay cambios sin commitear: ${dirty.slice(0, 4).join(', ')}${dirty.length > 4 ? '…' : ''}. Lo que subes debe estar en git.`));
    }
    try {
      git('fetch -q origin main');
      const behind = Number(git('rev-list --count HEAD..origin/main').trim());
      if (behind > 0) {
        results.push(fail(`Tu rama está ${behind} commits detrás de origin/main. Actualízala antes de subir.`));
      } else if (git('rev-parse --abbrev-ref HEAD').trim() !== 'main') {
        results.push(warn('No estás en main: lo que subes no coincide con lo que está en producción.'));
      } else {
        results.push(ok('Al día con origin/main'));
      }
    } catch {
      results.push(warn('No se pudo comparar con origin/main (¿sin conexión?).'));
    }
  } catch {
    results.push(warn('No se pudo revisar git.'));
  }
  return results;
}

function checkTests() {
  const results = [];
  for (const [name, command] of [
    ['Tipos (tsc)', 'npx tsc --noEmit'],
    ['Pruebas (jest)', 'npx jest --ci'],
  ]) {
    try {
      execSync(command, { cwd: ROOT, stdio: 'pipe', encoding: 'utf8' });
      results.push(ok(name));
    } catch (error) {
      const tail = `${error.stdout || ''}${error.stderr || ''}`.trim().split('\n').slice(-6).join('\n');
      results.push(fail(`${name} falla:\n${tail}`));
    }
  }
  return results;
}

function printResults(results) {
  const icon = { ok: '✓', warn: '!', error: '✗' };
  results.forEach(r => console.log(`  ${icon[r.level]} ${r.message}`));
  const errors = results.filter(r => r.level === 'error').length;
  const warnings = results.filter(r => r.level === 'warn').length;
  console.log(errors === 0 ? `\nListo para subir${warnings ? ` (${warnings} aviso${warnings > 1 ? 's' : ''})` : ''}.` : `\nNO subir: ${errors} problema${errors > 1 ? 's' : ''}.`);
  return errors === 0;
}

// ---------- comandos ----------

function check(args) {
  const results = [...checkProject(), ...checkGit()];
  // Dentro de Xcode no se corren las pruebas: ya se corren a mano y tardarían.
  if (!args.includes('--sin-pruebas') && !args.includes('--desde-xcode')) {
    results.push(...checkTests());
  }
  console.log('Validación de la subida a App Store Connect\n');
  return printResults(results) ? 0 : 1;
}

function bump(args) {
  let pbx = fs.readFileSync(PBX, 'utf8');
  const versionFlag = args.indexOf('--version');
  if (versionFlag !== -1) {
    const version = args[versionFlag + 1];
    if (!parseVersion(version || '')) {
      console.error('Uso: bump --version X.Y.Z (por ejemplo 1.0.0)');
      return 1;
    }
    pbx = writeSetting(pbx, 'MARKETING_VERSION', version);
  }
  const last = lastUpload(readRecord());
  const current = Number(readSetting(pbx, 'CURRENT_PROJECT_VERSION')[0]);
  const next = current > last.build ? current : last.build + 1;
  pbx = writeSetting(pbx, 'CURRENT_PROJECT_VERSION', next);
  fs.writeFileSync(PBX, pbx);
  console.log(`Versión ${readSetting(pbx, 'MARKETING_VERSION')[0]}, compilación ${next}${next === current ? ' (ya era válida)' : ''}.`);
  return 0;
}

function registrar() {
  const results = [...checkProject(), ...checkGit()].filter(r => r.level === 'error');
  if (results.length > 0) {
    console.error('No se registra la subida: primero resuelve estos problemas.\n');
    results.forEach(r => console.error(`  ✗ ${r.message}`));
    return 1;
  }
  const pbx = fs.readFileSync(PBX, 'utf8');
  const record = readRecord();
  let commit = '';
  try {
    commit = git('rev-parse --short HEAD').trim();
  } catch {
    commit = '';
  }
  record.subidas = record.subidas || [];
  record.subidas.push({
    version: readSetting(pbx, 'MARKETING_VERSION')[0],
    compilacion: Number(readSetting(pbx, 'CURRENT_PROJECT_VERSION')[0]),
    fecha: new Date().toISOString().slice(0, 10),
    commit,
  });
  fs.writeFileSync(RECORD, `${JSON.stringify(record, null, 2)}\n`);
  const entry = record.subidas[record.subidas.length - 1];
  console.log(`Subida registrada: ${entry.version} (${entry.compilacion}). Commitea ios/subidas.json.`);
  return 0;
}

function main() {
  const [command, ...args] = process.argv.slice(2);
  const commands = { check, bump, registrar };
  if (!commands[command]) {
    console.error('Uso: node scripts/ios-release.js <check|bump|registrar> [opciones]');
    return 1;
  }
  return commands[command](args);
}

if (require.main === module) {
  process.exit(main());
}

module.exports = { readSetting, writeSetting, parseVersion, compareVersions, pngInfo, lastUpload, checkVersioning };
