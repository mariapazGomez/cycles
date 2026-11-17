import React, { forwardRef } from 'react';
import Svg, { Defs, G, Image as SvgImage, LinearGradient, Path, Rect, Stop, Text as SvgText, TSpan } from 'react-native-svg';
import { intensityRamp, noLoadFill } from '../../theme/colors';
import { GROUPS, type GroupKey } from '../../utils/muscleSummary';
import { SHARE_FORMATS, fitTitle, shareAltText, type ShareData, type ShareFormat } from '../../utils/shareSession';
import { bodyViews } from '../bodyZones';

const IMAGES = {
  front: require('../../assets/body/front.png'),
  back: require('../../assets/body/back.png'),
};

// Rampa para fondo oscuro: más series = más claro, para que el grupo más trabajado siga destacando.
const darkRamp = ['#1d3f86', '#2a63d1', '#3080fc', '#7fb0fd', '#cfe0fd'];

const hex = (c: string) => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
function ramp(colors: readonly string[], t: number): string {
  const s = Math.max(0, Math.min(1, t)) * (colors.length - 1);
  const i = Math.min(Math.floor(s), colors.length - 2);
  const f = s - i;
  const a = hex(colors[i]);
  const b = hex(colors[i + 1]);
  return `#${a.map((x, k) => Math.round(x + (b[k] - x) * f).toString(16).padStart(2, '0')).join('')}`;
}

interface Theme {
  bg: string | null;
  ink: string;
  muted: string;
  noLoad: string;
  ramp: readonly string[];
  halo: string | null;
  figureImageOpacity: number;
  outline: boolean;
}

function themeFor(format: ShareFormat, variant: 0 | 1): Theme {
  if (format === 'bare') {
    const white = variant === 0;
    return {
      bg: null,
      ink: white ? '#ffffff' : '#1f2228',
      muted: white ? '#ffffff' : '#1f2228',
      noLoad: '#ffffff',
      ramp: intensityRamp,
      halo: white ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.7)',
      figureImageOpacity: 0.6,
      outline: true,
    };
  }
  const dark = variant === 1;
  const card = format === 'sticker';
  return {
    bg: dark ? '#1f2228' : card ? '#ffffff' : '#eef3fc',
    ink: dark ? '#ffffff' : '#1f2228',
    muted: dark ? '#b9c2d1' : '#4c5666',
    noLoad: dark ? '#4a5262' : noLoadFill,
    ramp: dark ? darkRamp : intensityRamp,
    halo: null,
    figureImageOpacity: dark ? 0.22 : 1,
    outline: false,
  };
}

function Figure({ view, x, y, w, data, theme }: { view: 'front' | 'back'; x: number; y: number; w: number; data: ShareData; theme: Theme }) {
  const { viewBox, zones } = bodyViews[view];
  const [vx, vy] = viewBox.split(' ').map(Number);
  const max = Math.max(0, ...GROUPS.map(g => data.groups[g.key]));
  return (
    <Svg x={x} y={y} width={w} height={(w * 810) / 400} viewBox={viewBox}>
      <SvgImage x={vx} y={vy} width={400} height={810} href={IMAGES[view]} opacity={theme.figureImageOpacity} />
      {zones.map((z, i) => {
        const sets = data.groups[z.group as GroupKey];
        const loaded = sets > 0 && max > 0;
        return (
          <Path
            key={`${z.group}-${i}`}
            d={z.d}
            fill={loaded ? ramp(theme.ramp, 0.1 + 0.9 * (sets / max)) : theme.noLoad}
            fillOpacity={loaded ? 0.92 : theme.outline ? 0.35 : 0.4}
            stroke={theme.outline && loaded ? '#ffffff' : 'none'}
            strokeWidth={theme.outline && loaded ? 2 : 0}
            strokeLinejoin="round"
          />
        );
      })}
    </Svg>
  );
}

function Isotype({ x, y, size }: { x: number; y: number; size: number }) {
  return (
    <Svg x={x} y={y} width={size} height={size} viewBox="0 0 100 100">
      <Path d="M17.09 69 A38 38 0 0 1 61.74 13.86" stroke="#3080fc" strokeWidth={20} strokeLinecap="round" fill="none" />
      <Path d="M81.5 28.75 A38 38 0 0 1 35.77 85.23" stroke="#3080fc" strokeWidth={20} strokeLinecap="round" fill="none" />
    </Svg>
  );
}

// Texto con contorno suave detrás cuando no hay fondo, para que se lea sobre cualquier foto.
function T({ theme, children, ...props }: React.ComponentProps<typeof SvgText> & { theme: Theme }) {
  return (
    <>
      {theme.halo && (
        <SvgText {...props} fill="none" stroke={theme.halo} strokeWidth={10} strokeLinejoin="round">
          {children}
        </SvgText>
      )}
      <SvgText {...props}>{children}</SvgText>
    </>
  );
}

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

function Legend({ y, right, theme, size }: { y: number; right: number; theme: Theme; size: number }) {
  const barW = 230;
  const stops = theme.ramp;
  return (
    <G>
      <Defs>
        <LinearGradient id="legend" x1="0" y1="0" x2="1" y2="0">
          {stops.map((c, i) => (
            <Stop key={c} offset={i / (stops.length - 1)} stopColor={c} />
          ))}
        </LinearGradient>
      </Defs>
      <SvgText x={right - 160 - barW - 14} y={y} fontSize={size} fontWeight="600" fill={theme.muted} textAnchor="end">
        Menos
      </SvgText>
      <Rect x={right - 160 - barW} y={y - 16} width={barW} height={16} rx={8} fill="url(#legend)" />
      <SvgText x={right} y={y} fontSize={size} fontWeight="600" fill={theme.muted} textAnchor="end">
        Más series
      </SvgText>
    </G>
  );
}

interface Props {
  data: ShareData;
  format: ShareFormat;
  variant: 0 | 1;
  width: number;
  height: number;
}

// La imagen compartible, dibujada como SVG para exportarla a PNG en el teléfono.
export const ShareImage = forwardRef<Svg, Props>(function ShareImage({ data, format, variant, width, height }, ref) {
  const spec = SHARE_FORMATS.find(f => f.key === format)!;
  const theme = themeFor(format, variant);
  const W = spec.width;
  const H = spec.height;
  const compact = format === 'sticker' || format === 'bare';
  const title = fitTitle(data.name, compact ? 48 : format === 'story' ? 120 : 104);
  const minutes = data.minutes === null ? '–' : String(data.minutes);

  const body = compact ? (
    <>
      {theme.bg && <Rect x={0} y={0} width={W} height={H} rx={52} fill={theme.bg} />}
      <Figure view="front" x={30} y={20} w={150} data={data} theme={theme} />
      <Figure view="back" x={186} y={20} w={150} data={data} theme={theme} />
      <T theme={theme} x={372} y={74} fontSize={title.size} fontWeight="800" fill={theme.ink}>
        {title.text}
      </T>
      {[
        [String(data.exercises), plural(data.exercises, 'ejercicio', 'ejercicios')],
        [String(data.sets), plural(data.sets, 'serie', 'series')],
        [minutes, 'min'],
      ].map(([n, unit], i) => (
        <T key={unit} theme={theme} x={372} y={140 + i * 66} fontSize={56} fontWeight="800" fill={theme.ink}>
          {n}
          <TSpan fontSize={24} fontWeight="600" dx={10} fill={theme.muted}>
            {unit}
          </TSpan>
        </T>
      ))}
      <Isotype x={372} y={286} size={42} />
      <T theme={theme} x={424} y={320} fontSize={32} fontWeight="800" fill={theme.ink}>
        Cycles
      </T>
    </>
  ) : (
    (() => {
      const story = format === 'story';
      const fw = story ? 400 : 330;
      const fy = story ? 340 : 210;
      const figBottom = fy + (fw * 810) / 400;
      const dy = story ? figBottom + 190 : figBottom + 160;
      const items = [
        [String(data.exercises), plural(data.exercises, 'ejercicio', 'ejercicios')],
        [String(data.sets), plural(data.sets, 'serie', 'series')],
        [minutes, 'min'],
      ];
      const gap = story ? 320 : 300;
      const bottom = story ? 1500 : 1180;
      return (
        <>
          <Rect x={0} y={0} width={W} height={H} fill={theme.bg!} />
          <SvgText x={96} y={story ? 340 : 190} fontSize={title.size} fontWeight="800" fill={theme.ink}>
            {title.text}
          </SvgText>
          <Figure view="front" x={story ? 150 : 140} y={fy + (story ? 40 : 30)} w={fw} data={data} theme={theme} />
          <Figure view="back" x={story ? 530 : 610} y={fy + (story ? 40 : 30)} w={fw} data={data} theme={theme} />
          <SvgText x={(story ? 150 : 140) + fw / 2} y={figBottom + (story ? 70 : 60)} fontSize={26} fontWeight="600" fill={theme.muted} textAnchor="middle">
            Frente
          </SvgText>
          <SvgText x={(story ? 530 : 610) + fw / 2} y={figBottom + (story ? 70 : 60)} fontSize={26} fontWeight="600" fill={theme.muted} textAnchor="middle">
            Espalda
          </SvgText>
          {items.map(([n, unit], i) => (
            <G key={unit}>
              <SvgText x={96 + i * gap} y={dy} fontSize={story ? 110 : 96} fontWeight="800" fill={theme.ink}>
                {n}
              </SvgText>
              <SvgText x={96 + i * gap} y={dy + 52} fontSize={34} fontWeight="600" fill={theme.muted}>
                {unit}
              </SvgText>
            </G>
          ))}
          <Isotype x={96} y={bottom} size={64} />
          <SvgText x={180} y={bottom + 48} fontSize={46} fontWeight="800" fill={theme.ink}>
            Cycles
          </SvgText>
          <Legend y={bottom + 42} right={W - 96} theme={theme} size={26} />
        </>
      );
    })()
  );

  return (
    <Svg ref={ref} width={width} height={height} viewBox={`0 0 ${W} ${H}`} accessible accessibilityLabel={shareAltText(data)}>
      {body}
    </Svg>
  );
});
