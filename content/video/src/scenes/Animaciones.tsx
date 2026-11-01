import React from "react";
import { staticFile } from "remotion";
import { clamp, Phase, useT } from "../anim";
import { BLUE, WHITE, MUTED } from "../theme";
import { Bead, Chain, Label, Node } from "./parts";

const pulse = (t: number, t0: number) => ((t - t0) % 1.4) / 1.4; // 0..1 repetido

// 0–8 s: el primer producto no es el final; lo importante es empezar.
const Primero: React.FC = () => {
  const t = useT();
  const xs = [130, 360, 590, 820];
  const names = ["Versión 1", "Versión 2", "Versión 3", "Producto final"];
  const dim = clamp(t, 5.4, 5.9, 1, 0.3);
  return (
    <g>
      <Label x={460} y={105} size={46} weight={800} font="d" o={clamp(t, 0.4, 0.9)}>
        El primer producto no es el final
      </Label>
      {xs.map((x, k) => {
        const t0 = 1.0 + 1.2 * k;
        const s = clamp(t, t0, t0 + 0.4);
        const o = k === 0 ? 1 : dim;
        return (
          <g key={k}>
            {k > 0 && <g opacity={dim}><Chain x1={xs[k - 1] + 40} y1={290} x2={x - 40} y2={290} p={clamp(t, t0 - 0.9, t0)} /></g>}
            <Node x={x} y={290} r={k === 3 ? 44 : 34} s={s} solid={k === 3} ring={k === 0 && t > 5.5 ? pulse(t, 5.5) : 0} o={o} />
            <Label x={x} y={370} size={26} o={s * o} fill={k === 0 && t > 5.5 ? WHITE : MUTED}>{names[k]}</Label>
          </g>
        );
      })}
      <g opacity={clamp(t, 5.5, 6.0)}>
        <rect x={60} y={175} width={140} height={46} rx={23} fill={BLUE} />
        <Label x={130} y={207} size={26}>Empezar</Label>
      </g>
    </g>
  );
};

// 8.6–14: la primera aplicación y lo que quería hacer después.
const Primera: React.FC = () => {
  const t = useT();
  return (
    <g>
      <Label x={460} y={105} size={46} weight={800} font="d" o={clamp(t, 8.7, 9.2)}>La primera aplicación</Label>
      <Node x={210} y={290} r={50} s={clamp(t, 8.8, 9.3)} solid />
      <Label x={210} y={390} size={26} o={clamp(t, 9.0, 9.5)}>Lo que hice</Label>
      <Chain x1={275} y1={290} x2={625} y2={290} p={clamp(t, 9.6, 12.0)} n={12} />
      <g opacity={clamp(t, 11.8, 12.4)}>
        <circle cx={710} cy={290} r={50} fill="none" stroke={BLUE} strokeWidth={5} strokeDasharray="10 12" />
        <Label x={710} y={392} size={26}>Lo que quería hacer</Label>
      </g>
    </g>
  );
};

// 14–25.4: Excel → IA → visualización.
const ExcelIA: React.FC = () => {
  const t = useT();
  return (
    <g>
      <Label x={460} y={95} size={44} weight={800} font="d" o={clamp(t, 14.2, 14.7)}>De Excel a algo más claro</Label>
      <g opacity={clamp(t, 14.2, 14.7)}>
        <rect x={50} y={205} width={220} height={170} rx={14} fill="#2a2f38" stroke={BLUE} strokeWidth={4} />
        {[0, 1, 2, 3].map((r) => <line key={"h" + r} x1={50} x2={270} y1={243 + r * 33} y2={243 + r * 33} stroke={MUTED} strokeOpacity={0.5} strokeWidth={2} />)}
        {[0, 1, 2].map((c) => <line key={"v" + c} y1={205} y2={375} x1={104 + c * 55} x2={104 + c * 55} stroke={MUTED} strokeOpacity={0.5} strokeWidth={2} />)}
        <Label x={160} y={410} size={26}>Excel</Label>
      </g>
      <Chain x1={285} y1={290} x2={385} y2={290} p={clamp(t, 15.0, 16.4)} n={5} />
      <g opacity={clamp(t, 15.6, 16.3)}>
        <Node x={460} y={290} r={58} s={1} solid ring={t > 16.4 && t < 21 ? pulse(t, 16.4) : 0} />
        <Label x={460} y={302} size={36} weight={800} font="d">IA</Label>
        <Label x={460} y={400} size={26}>Modelo de IA</Label>
      </g>
      <Chain x1={530} y1={290} x2={680} y2={290} p={clamp(t, 17.6, 18.6)} n={6} />
      <g opacity={clamp(t, 18.2, 18.8)} transform={`translate(${30 * (1 - clamp(t, 18.2, 18.9))} 0)`}>
        <defs><clipPath id="appclip"><rect x={700} y={125} width={161} height={330} rx={22} /></clipPath></defs>
        <image href={staticFile("app-hoy.png")} x={700} y={125} width={161} height={330} preserveAspectRatio="xMidYMid slice" clipPath="url(#appclip)" />
        <Label x={780} y={492} size={26}>La app, hoy</Label>
      </g>
    </g>
  );
};

// 25.7–29.4: hacerlo a mano cada vez no tenía sentido.
const CadaVez: React.FC = () => {
  const t = useT();
  const count = t < 26.4 ? 1 : t < 27.4 ? 2 : t < 28.4 ? 3 : 4;
  const rot = (t - 25.7) * 150;
  const cross = clamp(t, 28.7, 29.1);
  return (
    <g>
      <Label x={460} y={95} size={44} weight={800} font="d">Cada vez, a mano</Label>
      <g transform={`rotate(${rot} 460 280)`} opacity={1 - 0.6 * cross}>
        {Array.from({ length: 24 }, (_, i) => {
          const a = (i / 24) * Math.PI * 2;
          return <Bead key={i} x={460 + 130 * Math.cos(a)} y={280 + 130 * Math.sin(a)} r={5 + 5 * Math.abs(Math.sin(i * 0.9))} o={i % 2 ? 0.5 : 0.95} />;
        })}
      </g>
      <Label x={460} y={298} size={80} weight={800} font="d" o={1 - 0.6 * cross}>×{count}</Label>
      <g opacity={cross} transform={`translate(460 280)`}>
        <line x1={-60} y1={-60} x2={60} y2={60} stroke={WHITE} strokeWidth={14} strokeLinecap="round" />
        <line x1={60} y1={-60} x2={-60} y2={60} stroke={WHITE} strokeWidth={14} strokeLinecap="round" />
      </g>
      <Label x={460} y={470} size={32} o={cross}>Sin sentido</Label>
    </g>
  );
};

// 29.5–32: pensé en el atleta, como usuario.
const Atleta: React.FC = () => {
  const t = useT();
  const s = clamp(t, 29.6, 30.1);
  return (
    <g>
      <Label x={460} y={95} size={44} weight={800} font="d" o={s}>Pensé en el atleta</Label>
      <g transform={`translate(460 290) scale(${s})`}>
        <circle cx={0} cy={-70} r={46} fill={BLUE} />
        <path d="M -95 90 C -95 10 -50 -5 0 -5 C 50 -5 95 10 95 90 Z" fill={BLUE} />
      </g>
      <Label x={460} y={445} size={32} o={clamp(t, 30.4, 30.9)}>como usuario</Label>
    </g>
  );
};

// 49.7–58.1: de una app a un sistema.
const Sistema: React.FC = () => {
  const t = useT();
  const N = 10;
  const R = 150;
  const cx = 460, cy = 270;
  const closed = clamp(t, 54.1, 55.0);
  return (
    <g>
      <Phase from={49.7} to={56.5} fade={0.25}>
        <g>
          {Array.from({ length: N }, (_, i) => {
            const a = (i / N) * Math.PI * 2 - Math.PI / 2;
            const p = clamp(t, 51.2 + i * 0.25, 51.7 + i * 0.25);
            return <Bead key={i} x={cx + R * Math.cos(a) * p} y={cy + R * Math.sin(a) * p} r={11 * p} o={0.9} />;
          })}
          <circle cx={cx} cy={cy} r={R} fill="none" stroke={BLUE} strokeWidth={5} strokeOpacity={0.5 * closed} strokeDasharray={`${closed * 942} 942`} transform={`rotate(-90 ${cx} ${cy})`} />
          <Node x={cx} y={cy} r={56} s={clamp(t, 49.8, 50.3)} solid ring={t > 54.1 ? pulse(t, 54.1) : 0} />
        </g>
        <Label x={cx} y={cy + 8} size={26} weight={800} font="d" o={clamp(t, 50.1, 50.5, 0, 1) * (1 - closed)}>App</Label>
        <Label x={cx} y={cy + 8} size={22} weight={800} font="d" o={closed}>Sistema</Label>
        <Label x={cx} y={485} size={36} weight={800} font="d" o={clamp(t, 50.1, 50.6) * (1 - clamp(t, 53.9, 54.2))}>Una app</Label>
        <Label x={cx} y={485} size={36} weight={800} font="d" o={clamp(t, 54.2, 54.7)}>Un sistema</Label>
      </Phase>
      <Phase from={56.5} to={58.2} fade={0.3}>
        <image href={staticFile("isotipo.png")} x={150} y={170} width={200} height={200} />
        <text x={370} y={305} fontFamily="Bricolage Grotesque, Inter, sans-serif" fontWeight={800} fontSize={120} fill={WHITE}>Cycles</text>
      </Phase>
    </g>
  );
};

export const Animaciones: React.FC = () => (
  <>
    <Phase from={0.3} to={8.3}><Primero /></Phase>
    <Phase from={8.6} to={14.05}><Primera /></Phase>
    <Phase from={14.05} to={25.5}><ExcelIA /></Phase>
    <Phase from={25.7} to={29.45}><CadaVez /></Phase>
    <Phase from={29.5} to={32.0}><Atleta /></Phase>
    <Sistema />
  </>
);
