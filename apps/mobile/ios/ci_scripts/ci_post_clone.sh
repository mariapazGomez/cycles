#!/bin/sh
# Xcode Cloud ejecuta este script justo después de clonar el repositorio, antes
# de compilar. Prepara lo que un Mac limpio de Apple no trae: Node, las
# dependencias de npm de la app y los pods de iOS. Xcode Cloud busca la carpeta
# ci_scripts junto al proyecto de Xcode (apps/mobile/ios) y el nombre del archivo
# tiene que ser exactamente ci_post_clone.sh.
set -eu

# Raíz del repositorio (Xcode Cloud la define; en pruebas locales se calcula).
REPO="${CI_PRIMARY_REPOSITORY_PATH:-$(cd "$(dirname "$0")/../../../.." && pwd)}"
IOS="$REPO/apps/mobile/ios"

echo "== Node"
node_major() { "$1" -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0; }
if ! command -v node >/dev/null 2>&1 || [ "$(node_major node)" -lt 22 ]; then
  # La app exige Node 22 o más nuevo (engines de apps/mobile y del monorepo).
  brew install node@22
  PATH="$(brew --prefix node@22)/bin:$PATH"
  export PATH
fi
echo "node $(node -v), npm $(npm -v)"

echo "== Dependencias de npm (solo la app móvil y el paquete compartido)"
cd "$REPO"
npm ci --workspace apps/mobile --workspace packages/shared --include-workspace-root --no-audit --no-fund

# Las fases de compilación (empaquetar el JavaScript y el validador de subidas)
# no heredan el PATH de este script: se les indica dónde está Node.
echo "export NODE_BINARY=$(command -v node)" > "$IOS/.xcode.env.local"

echo "== CocoaPods"
# CocoaPods se cae con "Unicode Normalization not appropriate for ASCII-8BIT" si
# la terminal no declara UTF-8, y en Xcode Cloud LANG puede venir vacío.
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8
if ! command -v pod >/dev/null 2>&1; then
  brew install cocoapods
fi
cd "$IOS"
pod install

echo "== Listo para compilar"
