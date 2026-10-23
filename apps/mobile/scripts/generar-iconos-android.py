#!/usr/bin/env python3
"""Genera los íconos de Android a partir del ícono de iOS (el isotipo azul
sobre fondo oscuro) y los gráficos de la ficha de Google Play.

Uso, desde apps/mobile:  python3 scripts/generar-iconos-android.py
Necesita Pillow. Escribe en android/app/src/main/res/mipmap-* y en
android/play-store/. Es determinista: volver a correrlo da los mismos archivos.
"""
from pathlib import Path

from PIL import Image, ImageDraw

RAIZ = Path(__file__).resolve().parent.parent
ICONO_IOS = RAIZ / "ios/CyclesMobile/Images.xcassets/AppIcon.appiconset/icon-1024.png"
LOGO_WEB = RAIZ.parent / "web/src/assets/logo-cycles.png"
RES = RAIZ / "android/app/src/main/res"
TIENDA = RAIZ / "android/play-store"

FONDO = (31, 34, 40)    # brand-ink
AZUL = (48, 128, 252)   # brand-blue
PAGINA = (243, 245, 248)


def aislar_isotipo(origen: Image.Image) -> Image.Image:
    """Quita el fondo oscuro del ícono de iOS: deja el anillo azul con
    transparencia (el borde suave se conserva como alfa)."""
    rgb = origen.convert("RGB")
    ancho, alto = rgb.size
    salida = Image.new("RGBA", (ancho, alto), AZUL + (0,))
    px, out = rgb.load(), salida.load()
    for y in range(alto):
        for x in range(ancho):
            g = px[x, y][1]
            t = (g - FONDO[1]) / (AZUL[1] - FONDO[1])
            alfa = max(0.0, min(1.0, t))
            out[x, y] = AZUL + (round(alfa * 255),)
    return salida


def mascara_redondeada(tam: int, radio: float) -> Image.Image:
    m = Image.new("L", (tam * 4, tam * 4), 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, tam * 4 - 1, tam * 4 - 1), radius=radio * tam * 4, fill=255)
    return m.resize((tam, tam), Image.LANCZOS)


def mascara_circulo(tam: int) -> Image.Image:
    m = Image.new("L", (tam * 4, tam * 4), 0)
    ImageDraw.Draw(m).ellipse((0, 0, tam * 4 - 1, tam * 4 - 1), fill=255)
    return m.resize((tam, tam), Image.LANCZOS)


def main() -> None:
    icono = Image.open(ICONO_IOS).convert("RGB")
    isotipo = aislar_isotipo(icono)

    # Íconos adaptativos (Android 8 en adelante): primer plano de 108 dp.
    # El anillo ocupa el 54 % del lienzo, dentro de la zona segura (61 %).
    densidades_fg = {"mdpi": 108, "hdpi": 162, "xhdpi": 216, "xxhdpi": 324, "xxxhdpi": 432}
    # Íconos de versiones anteriores (Android 7): 48 dp.
    densidades_legacy = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}

    for dens, tam in densidades_fg.items():
        carpeta = RES / f"mipmap-{dens}"
        carpeta.mkdir(parents=True, exist_ok=True)
        isotipo.resize((tam, tam), Image.LANCZOS).save(carpeta / "ic_launcher_foreground.png", optimize=True)

    for dens, tam in densidades_legacy.items():
        carpeta = RES / f"mipmap-{dens}"
        base = icono.resize((tam, tam), Image.LANCZOS).convert("RGBA")
        cuadrado = Image.new("RGBA", (tam, tam), (0, 0, 0, 0))
        cuadrado.paste(base, (0, 0), mascara_redondeada(tam, 0.18))
        cuadrado.save(carpeta / "ic_launcher.png", optimize=True)
        redondo = Image.new("RGBA", (tam, tam), (0, 0, 0, 0))
        redondo.paste(base, (0, 0), mascara_circulo(tam))
        redondo.save(carpeta / "ic_launcher_round.png", optimize=True)

    # Google Play: ícono de 512 px (cuadrado, sin esquinas: Play las redondea).
    TIENDA.mkdir(parents=True, exist_ok=True)
    icono.resize((512, 512), Image.LANCZOS).save(TIENDA / "icono-512.png", optimize=True)

    # Gráfico destacado de 1024 × 500: fondo claro, el logo y la cadena de
    # cuentas de la marca (círculos de tamaños y opacidades distintos).
    lienzo = Image.new("RGBA", (1024, 500), PAGINA + (255,))
    cadena = Image.new("RGBA", (1024, 500), (0, 0, 0, 0))
    d = ImageDraw.Draw(cadena)
    puntos = [(40, 400, 10, 70), (95, 365, 16, 110), (160, 335, 11, 90), (230, 330, 19, 140), (298, 352, 12, 100),
              (350, 395, 9, 70), (410, 425, 15, 120), (480, 420, 22, 160),
              (560, 385, 13, 100), (620, 335, 20, 150), (690, 290, 11, 90), (760, 262, 17, 120),
              (835, 262, 10, 80), (900, 285, 15, 110), (960, 322, 9, 70)]
    for x, y, r, a in puntos:
        y += 40
        d.ellipse((x - r, y - r, x + r, y + r), fill=AZUL + (a,))
    lienzo.alpha_composite(cadena)
    logo = Image.open(LOGO_WEB).convert("RGBA")
    ancho_logo = 520
    logo = logo.resize((ancho_logo, round(logo.height * ancho_logo / logo.width)), Image.LANCZOS)
    lienzo.alpha_composite(logo, ((1024 - logo.width) // 2, 100))
    lienzo.convert("RGB").save(TIENDA / "grafico-destacado-1024x500.png", optimize=True)

    print("Íconos y gráficos generados.")


if __name__ == "__main__":
    main()
