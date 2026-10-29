import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors, noLoadFill } from '../theme/colors';
import { GROUPS, groupFill, type GroupKey } from '../utils/muscleSummary';
import { bodyViews } from './bodyZones';

interface Props {
  /** Total por grupo, en el orden de GROUPS. */
  totals: number[];
  selected: GroupKey;
  onSelect: (key: GroupKey) => void;
}

const IMAGES = {
  front: require('../assets/body/front.png'),
  back: require('../assets/body/back.png'),
};

// Figura anatómica de frente y de espalda con cada grupo muscular coloreado
// según su carga, en una rampa de un solo azul (más oscuro = más carga). La
// imagen es de referencia: los datos solo distinguen siete grupos, y cada uno
// se pinta como una zona encima.
export function BodyMap({ totals, selected, onSelect }: Props) {
  const max = Math.max(0, ...totals);
  const fill = (key: GroupKey) => groupFill(totals[GROUPS.findIndex(g => g.key === key)], max, noLoadFill);
  const hasLoad = (key: GroupKey) => totals[GROUPS.findIndex(g => g.key === key)] > 0;

  const figure = (view: 'front' | 'back') => {
    const { viewBox, zones } = bodyViews[view];
    // La zona elegida se dibuja al final para que su borde quede encima.
    const ordered = [...zones.filter(z => z.group !== selected), ...zones.filter(z => z.group === selected)];
    return (
      <View style={styles.figure}>
        <View style={styles.canvas}>
          <Image source={IMAGES[view]} style={StyleSheet.absoluteFill} resizeMode="contain" />
          <Svg
            viewBox={viewBox}
            style={StyleSheet.absoluteFill}
            accessibilityLabel={`Figura ${view === 'front' ? 'de frente' : 'de espalda'} con los grupos musculares coloreados según la carga`}>
            {ordered.map((z, i) => (
              <Path
                key={`${z.group}-${i}`}
                d={z.d}
                fill={fill(z.group)}
                fillOpacity={hasLoad(z.group) ? 0.9 : 0.35}
                stroke={selected === z.group ? colors.ink : 'none'}
                strokeWidth={selected === z.group ? 2.5 : 0}
                strokeLinejoin="round"
                onPress={() => onSelect(z.group)}
              />
            ))}
          </Svg>
        </View>
        <Text style={styles.caption}>{view === 'front' ? 'Frente' : 'Espalda'}</Text>
      </View>
    );
  };

  return (
    <View style={styles.row}>
      {figure('front')}
      {figure('back')}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 4 },
  figure: { width: '46%' },
  canvas: { width: '100%', aspectRatio: 400 / 810 },
  caption: { textAlign: 'center', fontSize: 12, color: colors.inkSecondary, marginTop: 2 },
});
