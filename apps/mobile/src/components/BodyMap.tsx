import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Ellipse, Line, Path, Rect } from 'react-native-svg';
import { bodyBase, bodyOutline, colors, noLoadFill } from '../theme/colors';
import { GROUPS, groupFill, type GroupKey } from '../utils/muscleSummary';

interface Props {
  /** Total por grupo, en el orden de GROUPS. */
  totals: number[];
  selected: GroupKey;
  onSelect: (key: GroupKey) => void;
}

// Figura de frente y de espalda con cada grupo muscular coloreado según su
// carga, en una rampa de un solo azul (más oscuro = más carga). Es un dibujo
// esquemático: los datos solo distinguen siete grupos.
export function BodyMap({ totals, selected, onSelect }: Props) {
  const max = Math.max(0, ...totals);
  const fill = (key: GroupKey) => groupFill(totals[GROUPS.findIndex(g => g.key === key)], max, noLoadFill);
  const stroke = (key: GroupKey) => (selected === key ? colors.ink : '#ffffff');
  const sw = (key: GroupKey) => (selected === key ? 2.5 : 1.2);

  const common = (key: GroupKey) => ({
    fill: fill(key),
    stroke: stroke(key),
    strokeWidth: sw(key),
    onPress: () => onSelect(key),
  });

  const silhouette = (
    <>
      <Circle cx={100} cy={26} r={17} fill={bodyBase} stroke={bodyOutline} />
      <Rect x={92} y={40} width={16} height={14} rx={4} fill={bodyBase} stroke={bodyOutline} />
      <Path
        d="M66 62 Q100 54 134 62 L128 140 Q126 176 121 198 L79 198 Q74 176 72 140 Z"
        fill={bodyBase}
        stroke={bodyOutline}
      />
      <Ellipse cx={50} cy={106} rx={11} ry={32} transform="rotate(8 50 106)" fill={bodyBase} stroke={bodyOutline} />
      <Ellipse cx={150} cy={106} rx={11} ry={32} transform="rotate(-8 150 106)" fill={bodyBase} stroke={bodyOutline} />
      <Ellipse cx={42} cy={162} rx={9} ry={28} transform="rotate(5 42 162)" fill={bodyBase} stroke={bodyOutline} />
      <Ellipse cx={158} cy={162} rx={9} ry={28} transform="rotate(-5 158 162)" fill={bodyBase} stroke={bodyOutline} />
      <Ellipse cx={85} cy={262} rx={20} ry={68} fill={bodyBase} stroke={bodyOutline} />
      <Ellipse cx={115} cy={262} rx={20} ry={68} fill={bodyBase} stroke={bodyOutline} />
      <Ellipse cx={82} cy={346} rx={13} ry={46} fill={bodyBase} stroke={bodyOutline} />
      <Ellipse cx={118} cy={346} rx={13} ry={46} fill={bodyBase} stroke={bodyOutline} />
    </>
  );

  // Hombros, brazos y pantorrillas se ven igual de frente y de espalda.
  const shared = (
    <>
      <Ellipse cx={62} cy={74} rx={15} ry={13} {...common('shoulders')} />
      <Ellipse cx={138} cy={74} rx={15} ry={13} {...common('shoulders')} />
      <Ellipse cx={51} cy={110} rx={9} ry={22} transform="rotate(8 51 110)" {...common('arms')} />
      <Ellipse cx={149} cy={110} rx={9} ry={22} transform="rotate(-8 149 110)" {...common('arms')} />
      <Ellipse cx={42} cy={162} rx={7} ry={24} transform="rotate(5 42 162)" {...common('arms')} />
      <Ellipse cx={158} cy={162} rx={7} ry={24} transform="rotate(-5 158 162)" {...common('arms')} />
      <Ellipse cx={82} cy={346} rx={10} ry={38} {...common('legs')} />
      <Ellipse cx={118} cy={346} rx={10} ry={38} {...common('legs')} />
    </>
  );

  const figure = (view: 'front' | 'back') => (
    <View style={styles.figure}>
      <Svg
        viewBox="0 0 200 392"
        width="100%"
        style={styles.svg}
        accessibilityLabel={`Figura ${view === 'front' ? 'de frente' : 'de espalda'} con los grupos musculares coloreados según la carga`}>
        {silhouette}
        {shared}
        {view === 'front' ? (
          <>
            <Ellipse cx={84} cy={100} rx={19} ry={15} {...common('chest')} />
            <Ellipse cx={116} cy={100} rx={19} ry={15} {...common('chest')} />
            <Rect x={80} y={122} width={40} height={66} rx={10} {...common('core')} />
            {[138, 154, 170].map(y => (
              <Line key={y} x1={82} x2={118} y1={y} y2={y} stroke="#fff" strokeWidth={1.5} pointerEvents="none" />
            ))}
            <Line x1={100} x2={100} y1={124} y2={186} stroke="#fff" strokeWidth={1.5} pointerEvents="none" />
            <Ellipse cx={85} cy={258} rx={17} ry={58} {...common('legs')} />
            <Ellipse cx={115} cy={258} rx={17} ry={58} {...common('legs')} />
          </>
        ) : (
          <>
            <Path d="M100 52 L80 66 L100 94 L120 66 Z" {...common('back')} />
            <Path d="M82 94 L70 112 L80 152 L98 152 L98 100 Z" {...common('back')} />
            <Path d="M118 94 L130 112 L120 152 L102 152 L102 100 Z" {...common('back')} />
            <Rect x={90} y={154} width={20} height={34} rx={6} {...common('back')} />
            <Ellipse cx={86} cy={210} rx={19} ry={17} {...common('glutes')} />
            <Ellipse cx={114} cy={210} rx={19} ry={17} {...common('glutes')} />
            <Ellipse cx={85} cy={272} rx={17} ry={46} {...common('legs')} />
            <Ellipse cx={115} cy={272} rx={17} ry={46} {...common('legs')} />
          </>
        )}
      </Svg>
      <Text style={styles.caption}>{view === 'front' ? 'Frente' : 'Espalda'}</Text>
    </View>
  );

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
  svg: { aspectRatio: 200 / 392 },
  caption: { textAlign: 'center', fontSize: 12, color: colors.inkSecondary, marginTop: 2 },
});
