#!/bin/sh
# Lo llama la fase "Validar la subida a App Store Connect" del proyecto de Xcode
# (a través de with-environment.sh de React Native, que solo ejecuta UN comando
# sin argumentos: por eso existe este envoltorio). Falla en voz alta si no
# encuentra Node, para que la validación nunca se salte en silencio.
if [ -z "$NODE_BINARY" ]; then
  echo "error: No se encontro Node para validar la subida. Configura NODE_BINARY en ios/.xcode.env.local." >&2
  exit 1
fi
exec "$NODE_BINARY" "$SRCROOT/../scripts/ios-release.js" check --desde-xcode
