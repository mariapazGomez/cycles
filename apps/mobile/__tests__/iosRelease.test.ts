/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any */
// Buffer es de Node; el proyecto de la app no incluye los tipos de Node.
const { Buffer } = require('buffer');
const {
  readSetting,
  writeSetting,
  parseVersion,
  compareVersions,
  pngInfo,
  lastUpload,
  checkVersioning,
} = require('../scripts/ios-release');

const pbx = `
  buildSettings = {
    CURRENT_PROJECT_VERSION = 7;
    MARKETING_VERSION = 1.2.0;
    PRODUCT_BUNDLE_IDENTIFIER = app.getcycles.mobile;
  };
  buildSettings = {
    CURRENT_PROJECT_VERSION = 7;
    MARKETING_VERSION = 1.2.0;
    PRODUCT_BUNDLE_IDENTIFIER = "app.getcycles.mobile";
  };`;

const rec = (...uploads: Array<[string, number]>) => ({
  subidas: uploads.map(([version, compilacion]) => ({ version, compilacion })),
});
const check = (version: string, build: number, record: object) =>
  checkVersioning({ versions: [version, version], builds: [String(build), String(build)], record });

test('lee un ajuste en las dos configuraciones y quita las comillas', () => {
  expect(readSetting(pbx, 'CURRENT_PROJECT_VERSION')).toEqual(['7', '7']);
  expect(readSetting(pbx, 'PRODUCT_BUNDLE_IDENTIFIER')).toEqual(['app.getcycles.mobile', 'app.getcycles.mobile']);
  expect(readSetting(pbx, 'DEVELOPMENT_TEAM')).toEqual([]);
});

test('escribe un ajuste en las dos configuraciones sin tocar los demás', () => {
  const next = writeSetting(pbx, 'CURRENT_PROJECT_VERSION', 8);
  expect(readSetting(next, 'CURRENT_PROJECT_VERSION')).toEqual(['8', '8']);
  expect(readSetting(next, 'MARKETING_VERSION')).toEqual(['1.2.0', '1.2.0']);
});

test('solo acepta versiones X.Y.Z y las compara por número, no por texto', () => {
  expect(parseVersion('1.0.0')).toEqual([1, 0, 0]);
  expect(parseVersion('1.0')).toBeNull();
  expect(parseVersion('1.0.0-beta')).toBeNull();
  expect(compareVersions('1.10.0', '1.9.0')).toBe(1);
  expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
  expect(compareVersions('0.9.9', '1.0.0')).toBe(-1);
});

test('la última subida es la mayor compilación y la mayor versión', () => {
  expect(lastUpload(rec())).toEqual({ build: 0, version: null });
  expect(lastUpload(rec(['1.0.0', 1], ['1.0.0', 3], ['1.1.0', 2]))).toEqual({ build: 3, version: '1.1.0' });
});

test('acepta la primera subida y una compilación mayor que la anterior', () => {
  expect(check('1.0.0', 1, rec())).toEqual([]);
  expect(check('1.0.0', 4, rec(['1.0.0', 3]))).toEqual([]);
  expect(check('1.1.0', 4, rec(['1.0.0', 3]))).toEqual([]);
});

test('rechaza repetir o bajar la compilación: el error que Apple daría', () => {
  const same = check('1.0.0', 3, rec(['1.0.0', 3]));
  expect(same).toHaveLength(1);
  expect(same[0]).toContain('ya se usó');
  expect(same[0]).toContain('ios:bump');
  expect(check('1.0.0', 2, rec(['1.0.0', 3]))).toHaveLength(1);
  // una versión nueva tampoco puede reiniciar el contador
  expect(check('1.1.0', 1, rec(['1.0.0', 3]))).toHaveLength(1);
});

test('rechaza bajar la versión y formatos inválidos', () => {
  expect(check('1.0.0', 5, rec(['1.1.0', 3]))[0]).toContain('menor que la última subida');
  expect(check('1.0', 1, rec())[0]).toContain('X.Y.Z');
  expect(checkVersioning({ versions: ['1.0.0', '1.0.1'], builds: ['1', '1'], record: rec() })[0]).toContain('no coincide');
  expect(check('1.0.0', 0, rec())[0]).toContain('entero');
});

function png(width: number, height: number, colorType: number, extra: any[] = []) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = colorType;
  const chunk = (type: string, data: any) => {
    const out = Buffer.alloc(12 + data.length);
    out.writeUInt32BE(data.length, 0);
    out.write(type, 4, 'ascii');
    data.copy(out, 8);
    return out;
  };
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    ...extra,
    chunk('IDAT', Buffer.alloc(4)),
  ]);
}

test('lee el tamaño de un PNG y detecta la transparencia que Apple rechaza', () => {
  expect(pngInfo(png(1024, 1024, 2))).toEqual({ width: 1024, height: 1024, hasAlpha: false });
  expect(pngInfo(png(1024, 1024, 6)).hasAlpha).toBe(true);
  expect(pngInfo(png(1024, 1024, 4)).hasAlpha).toBe(true);
  const withTrns = png(1024, 1024, 2, [Buffer.concat([Buffer.from([0, 0, 0, 3]), Buffer.from('tRNS'), Buffer.alloc(7)])]);
  expect(pngInfo(withTrns).hasAlpha).toBe(true);
  expect(pngInfo(Buffer.from('no es un png'))).toBeNull();
});
