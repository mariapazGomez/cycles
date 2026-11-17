import React, { useRef, useState } from 'react';
import { PixelRatio, Platform, ScrollView, Share, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Svg, { Defs, Pattern, Rect } from 'react-native-svg';
import { Icon } from '../components/Icon';
import { PressableScale } from '../components/PressableScale';
import { Spinner } from '../components/Spinner';
import { ShareImage } from '../components/share/ShareImage';
import type { AppStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { SHARE_FORMATS, shareAltText, type ShareFormat } from '../utils/shareSession';

type Props = NativeStackScreenProps<AppStackParamList, 'ShareSession'>;

// Cuadros para que se note la transparencia de los formatos sin fondo.
function Checker() {
  return (
    <Svg style={StyleSheet.absoluteFill}>
      <Defs>
        <Pattern id="chk" patternUnits="userSpaceOnUse" width={24} height={24}>
          <Rect x={0} y={0} width={12} height={12} fill="#5f6872" />
          <Rect x={12} y={12} width={12} height={12} fill="#5f6872" />
          <Rect x={12} y={0} width={12} height={12} fill="#79838e" />
          <Rect x={0} y={12} width={12} height={12} fill="#79838e" />
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#chk)" />
    </Svg>
  );
}

// «Compartir tu sesión» (CYC-289): vista previa real, formato y variante. La imagen
// se dibuja en el teléfono y solo sale cuando el atleta elige dónde enviarla.
export function ShareSessionScreen({ route, navigation }: Props) {
  const data = route.params;
  const insets = useSafeAreaInsets();
  const { width: screenW } = useWindowDimensions();
  const [format, setFormat] = useState<ShareFormat>('post');
  const [variant, setVariant] = useState<0 | 1>(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const svgRef = useRef<Svg>(null);

  const spec = SHARE_FORMATS.find(f => f.key === format)!;
  const boxW = screenW - 40;
  const boxH = format === 'story' ? 400 : 330;
  const scale = Math.min(boxW / spec.width, boxH / spec.height);
  const previewW = spec.width * scale;
  const previewH = spec.height * scale;
  const transparent = format === 'sticker' || format === 'bare';
  // Los sin fondo se exportan al doble para que el sticker no salga borroso.
  const exportScale = transparent ? 2 : 1;
  // toDataURL mide en puntos y multiplica por la densidad de pantalla: se divide para que el PNG salga justo en píxeles (1080 de ancho).
  const exportW = (spec.width * exportScale) / PixelRatio.get();
  const exportH = (spec.height * exportScale) / PixelRatio.get();

  const handleShare = () => {
    if (busy) {
      return;
    }
    if (Platform.OS !== 'ios') {
      setError('Compartir la imagen estará disponible en Android pronto.');
      return;
    }
    setBusy(true);
    setError(null);
    svgRef.current?.toDataURL(
      async (base64: string) => {
        try {
          await Share.share({ url: `data:image/png;base64,${base64}` });
        } catch {
          setError('No pudimos abrir la hoja para compartir. Intenta de nuevo.');
        } finally {
          setBusy(false);
        }
      },
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: 24 }]}>
        <View style={styles.header}>
          <Text style={styles.title} accessibilityRole="header">
            Compartir tu sesión
          </Text>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10} accessibilityRole="button" accessibilityLabel="Cerrar">
            <Icon name="close" size={26} color={colors.inkSecondary} />
          </TouchableOpacity>
        </View>

        <View style={[styles.stage, { height: boxH + 24 }]}>
          <View style={[styles.preview, { width: previewW, height: previewH }]} accessible accessibilityRole="image" accessibilityLabel={shareAltText(data)}>
            {transparent && <Checker />}
            <ShareImage data={data} format={format} variant={variant} width={previewW} height={previewH} />
          </View>
        </View>

        {/* Copia a tamaño de exportación, fuera de pantalla: toDataURL exporta el tamaño del propio dibujo. */}
        <View pointerEvents="none" style={[styles.offscreen, { width: exportW, height: exportH }]} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
          <ShareImage ref={svgRef} data={data} format={format} variant={variant} width={exportW} height={exportH} />
        </View>

        <View style={styles.chips}>
          {SHARE_FORMATS.map(f => (
            <TouchableOpacity
              key={f.key}
              style={[styles.chip, f.key === format && styles.chipOn]}
              onPress={() => {
                setFormat(f.key);
                setVariant(0);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: f.key === format }}>
              <Text style={[styles.chipText, f.key === format && styles.chipTextOn]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.variants}>
          {spec.variants.map((label, i) => (
            <TouchableOpacity
              key={label}
              style={[styles.variant, variant === i && styles.chipOn]}
              onPress={() => setVariant(i as 0 | 1)}
              accessibilityRole="button"
              accessibilityState={{ selected: variant === i }}>
              <Text style={[styles.chipText, variant === i && styles.chipTextOn]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {transparent && <Text style={styles.hint}>Se guarda como imagen transparente. Pégala sobre tu foto en Instagram u otra app.</Text>}
        {error && <Text style={styles.error}>{error}</Text>}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <PressableScale style={[styles.primary, busy && styles.disabled]} onPress={handleShare} disabled={busy} accessibilityRole="button" accessibilityLabel="Compartir">
          {busy ? (
            <Spinner size={22} color={colors.onBlue} />
          ) : (
            <>
              <Icon name="share" size={20} color={colors.onBlue} />
              <Text style={styles.primaryText}>Compartir</Text>
            </>
          )}
        </PressableScale>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgApp },
  content: { paddingHorizontal: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  title: { fontSize: 26, fontWeight: '800', color: colors.ink },
  stage: { alignItems: 'center', justifyContent: 'center' },
  offscreen: { position: 'absolute', left: -20000, top: 0 },
  preview: { borderRadius: 14, overflow: 'hidden' },
  chips: { flexDirection: 'row', gap: 8, marginTop: 8 },
  chip: { paddingVertical: 11, paddingHorizontal: 13, borderRadius: 22, backgroundColor: colors.bg, borderWidth: 2, borderColor: 'transparent' },
  chipOn: { borderColor: colors.blue, backgroundColor: colors.blueTint },
  chipText: { fontSize: 14, fontWeight: '700', color: colors.ink },
  chipTextOn: { color: colors.blue },
  variants: { flexDirection: 'row', gap: 10, marginTop: 12 },
  variant: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 16, backgroundColor: colors.bg, borderWidth: 2, borderColor: 'transparent' },
  hint: { fontSize: 14, lineHeight: 20, color: colors.inkSecondary, marginTop: 14 },
  error: { fontSize: 14, color: colors.painInk, marginTop: 12 },
  footer: { paddingHorizontal: 20, paddingTop: 8 },
  primary: { minHeight: 56, borderRadius: 999, backgroundColor: colors.blue, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  primaryText: { fontSize: 17, fontWeight: '700', color: colors.onBlue },
  disabled: { opacity: 0.6 },
});
