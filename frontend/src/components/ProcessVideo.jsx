import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Camera, Check, CheckCircle2, Cloud, Cpu, MapPin, Pause, Play, RotateCcw, Smartphone, Wrench,
} from 'lucide-react';
import { useLang } from '../i18n';

/**
 * A ~35 second animated explainer of the whole DRISHTI AI flow, drawn live in
 * the browser (no video file): capture → upload → detect → assess → map → fix.
 * It behaves like a video player: play/pause, chapters, scrubbing, replay,
 * and it starts by itself the first time it scrolls into view.
 */

const CHAPTERS = [
  { key: 'capture', label: 'pipe.capture', start: 0, end: 6.5 },
  { key: 'upload', label: 'vid.ch.upload', start: 6.5, end: 10.5 },
  { key: 'detect', label: 'pipe.detect', start: 10.5, end: 16.5 },
  { key: 'assess', label: 'pipe.assess', start: 16.5, end: 22 },
  { key: 'map', label: 'pipe.map', start: 22, end: 27.5 },
  { key: 'fix', label: 'pipe.prioritise', start: 27.5, end: 36 },
];
const TOTAL = 36;

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const seg = (t, a, b) => clamp01((t - a) / (b - a));
const ease = (p) => 1 - Math.pow(1 - p, 3);
const pop = (p) => {
  // Overshoot ease for things that "land".
  const c = 1.7;
  const x = p - 1;
  return p <= 0 ? 0 : 1 + (c + 1) * x * x * x + c * x * x;
};

// Pothole box in the 1200×800 demo image, as percentages.
const BOX = { left: 35.8, top: 70, width: 27.5, height: 17.5 };

/* ------------------------------------------------------------ scenes */

function Phone({ children, style }) {
  return (
    <div
      className="absolute overflow-hidden rounded-[2.2cqw] border-[0.6cqw] border-[#1d2a25] bg-black shadow-2xl"
      style={{ width: '21cqw', aspectRatio: '9 / 18', ...style }}
    >
      <span className="absolute left-1/2 top-[1.2%] z-10 h-[2.2%] w-[30%] -translate-x-1/2 rounded-full bg-[#1d2a25]" />
      {children}
    </div>
  );
}

function CaptureScene({ s, t }) {
  const enter = ease(seg(s, 0, 0.9));
  const flash = s > 2.2 && s < 2.6 ? 1 - seg(s, 2.2, 2.6) : 0;
  const shot = s > 2.3;
  const pin = pop(seg(s, 3.0, 3.7));
  const card = ease(seg(s, 3.5, 4.2));
  const step = s < 3 ? 0 : s < 4.6 ? 1 : 2;
  const tap = seg(s, 5.2, 5.8);

  return (
    <>
      <Phone style={{ left: '14cqw', top: '50%', transform: `translateY(-50%) translateX(${(1 - enter) * -30}cqw) rotate(${(1 - enter) * -12}deg)` }}>
        <img src="/demo/pothole-0.svg" alt="" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: '55% 70%' }} />
        {!shot &&
          ['left-[8%] top-[18%] border-l-2 border-t-2', 'right-[8%] top-[18%] border-r-2 border-t-2', 'bottom-[22%] left-[8%] border-b-2 border-l-2', 'bottom-[22%] right-[8%] border-b-2 border-r-2'].map((c) => (
            <span key={c} className={`absolute h-[8%] w-[14%] border-white/90 ${c}`} />
          ))}
        <div className="absolute inset-x-0 bottom-0 flex h-[16%] items-center justify-center bg-black/60">
          <span
            className="grid h-[3.6cqw] w-[3.6cqw] place-items-center rounded-full border-[0.3cqw] border-white"
            style={{ transform: `scale(${s > 2 && s < 2.4 ? 0.85 : 1})` }}
          >
            <span className="h-[2.6cqw] w-[2.6cqw] rounded-full bg-white" />
          </span>
        </div>
        <div className="absolute inset-0 bg-white" style={{ opacity: flash }} />
        {shot && (
          <span className="absolute left-[6%] top-[6%] rounded bg-brand-600 px-[0.6cqw] py-[0.2cqw] text-[1.1cqw] font-bold text-white">
            <Check className="mr-1 inline h-[1.2cqw] w-[1.2cqw]" />
            1
          </span>
        )}
      </Phone>

      {/* tap indicator on the phone shutter */}
      {s > 1.6 && s < 2.6 && (
        <span
          className="absolute rounded-full border-2 border-white/80"
          style={{ left: '22.6cqw', top: 'calc(50% + 15.6cqw)', width: '4cqw', height: '4cqw', transform: `translate(-50%,-50%) scale(${1 + seg(s, 1.6, 2.6)})`, opacity: 1 - seg(s, 1.6, 2.6) }}
        />
      )}

      {/* GPS + form card */}
      <div className="absolute right-[10cqw] top-1/2 w-[38cqw] -translate-y-1/2">
        <div className="relative mx-auto mb-[2cqw] h-[10cqw] w-[10cqw]">
          <span className="absolute inset-0 rounded-full bg-magenta-500/25" style={{ transform: `scale(${0.4 + pin * 0.8})`, opacity: pin ? 1 - seg(s, 3.7, 6) * 0.6 : 0 }} />
          <MapPin
            className="absolute left-1/2 top-1/2 h-[6cqw] w-[6cqw] text-magenta-500 drop-shadow-lg"
            style={{ transform: `translate(-50%, ${-60 - (1 - pin) * 120}%)`, opacity: pin ? 1 : 0 }}
            fill="#f42a41"
            stroke="#fff"
          />
        </div>
        <div className="rounded-[1.4cqw] bg-white p-[1.8cqw] text-ink shadow-2xl" style={{ opacity: card, transform: `translateY(${(1 - card) * 3}cqw)` }}>
          <p className="text-[1.5cqw] font-bold">Zindabazar Point, Sylhet</p>
          <p className="font-mono text-[1.1cqw] text-ink-muted">24.8949°N · 91.8687°E</p>
          <div className="mt-[1.4cqw] grid grid-cols-3 gap-[0.8cqw]">
            {[Camera, MapPin, Check].map((Icon, i) => (
              <span
                key={i}
                className={`flex items-center justify-center gap-[0.4cqw] rounded-[0.8cqw] py-[0.6cqw] text-[1.1cqw] font-semibold transition-colors duration-300 ${
                  i <= step ? 'bg-brand-600 text-white' : 'bg-canvas text-ink-muted'
                }`}
              >
                <Icon className="h-[1.3cqw] w-[1.3cqw]" />
                {i + 1}
              </span>
            ))}
          </div>
          <div
            className="relative mt-[1.2cqw] rounded-[0.8cqw] bg-brand-gradient py-[0.9cqw] text-center text-[1.3cqw] font-bold text-white"
            style={{ transform: `scale(${tap > 0 && tap < 0.5 ? 0.95 : 1})` }}
          >
            {t('rep.submit')}
            {tap > 0 && (
              <span
                className="absolute left-1/2 top-1/2 rounded-full bg-white/50"
                style={{ width: '6cqw', height: '6cqw', transform: `translate(-50%,-50%) scale(${tap * 2})`, opacity: 1 - tap }}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function UploadScene({ s, t, num }) {
  const p = seg(s, 0.4, 2.8);
  const fly = ease(p);
  const done = s > 2.9;
  // Arc from phone (left) to cloud (right).
  const x = 18 + fly * 58;
  const y = 50 - Math.sin(fly * Math.PI) * 22;

  return (
    <>
      <div className="absolute left-[12cqw] top-1/2 grid h-[14cqw] w-[14cqw] -translate-y-1/2 place-items-center rounded-[2cqw] bg-white/5 ring-1 ring-white/10">
        <Smartphone className="h-[7cqw] w-[7cqw] text-brand-300" />
      </div>
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 56.25" preserveAspectRatio="none">
        <path d="M 22 28 Q 50 2 78 28" fill="none" stroke="rgba(120,216,172,0.45)" strokeWidth="0.35" strokeDasharray="1.2 1.2" style={{ strokeDashoffset: -s * 6 }} />
      </svg>
      <img
        src="/demo/pothole-0.svg"
        alt=""
        className="absolute rounded-[0.6cqw] shadow-xl ring-2 ring-white"
        style={{ width: '9cqw', left: `${x}%`, top: `${y}%`, transform: `translate(-50%,-50%) rotate(${(1 - fly) * -8}deg) scale(${1 - fly * 0.4})`, opacity: p < 1 ? 1 : 0 }}
      />
      <div className="absolute right-[12cqw] top-1/2 grid h-[14cqw] w-[14cqw] -translate-y-1/2 place-items-center rounded-[2cqw] bg-white/5 ring-1 ring-white/10">
        <Cloud className="h-[7cqw] w-[7cqw] text-brand-300" style={{ transform: `scale(${done ? 1 + Math.max(0, 0.15 - (s - 2.9) * 0.3) : 1})` }} />
        {done && (
          <span className="absolute -right-[1cqw] -top-[1cqw] grid h-[4cqw] w-[4cqw] place-items-center rounded-full bg-sev-low text-white shadow-lg" style={{ transform: `scale(${pop(seg(s, 2.9, 3.4))})` }}>
            <Check className="h-[2.4cqw] w-[2.4cqw]" />
          </span>
        )}
      </div>
      <div className="absolute bottom-[16%] left-1/2 w-[40cqw] -translate-x-1/2 text-center">
        <div className="flex justify-between text-[1.3cqw] text-white/70">
          <span>{done ? t('vid.queued') : t('rep.uploading')}</span>
          <span className="font-mono">{num(Math.round(p * 100))}%</span>
        </div>
        <div className="mt-[0.6cqw] h-[0.7cqw] overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-magenta-500" style={{ width: `${p * 100}%` }} />
        </div>
      </div>
    </>
  );
}

function DetectScene({ s, t, num, hazard }) {
  const enter = ease(seg(s, 0, 0.8));
  const scan = seg(s, 0.6, 3);
  const box = ease(seg(s, 2.6, 3.3));
  const label = pop(seg(s, 3.2, 3.7));
  const conf = seg(s, 3.2, 4.2) * 0.91;
  const list = ease(seg(s, 4, 4.8));

  return (
    <>
      <div
        className="absolute left-[6cqw] top-1/2 w-[56cqw] overflow-hidden rounded-[1.2cqw] ring-1 ring-white/15"
        style={{ aspectRatio: '3 / 2', transform: `translateY(-50%) scale(${0.9 + enter * 0.1})`, opacity: enter }}
      >
        <img src="/demo/pothole-0.svg" alt="" className="absolute inset-0 h-full w-full" />
        {scan > 0 && scan < 1 && (
          <div className="absolute inset-x-0 h-[18%] bg-gradient-to-b from-transparent via-magenta-400/35 to-transparent" style={{ top: `${scan * 100 - 9}%` }}>
            <div className="absolute inset-x-0 top-1/2 h-[2px] bg-magenta-400 shadow-[0_0_12px_2px_rgba(244,42,65,0.8)]" />
          </div>
        )}
        <div
          className="absolute rounded-[0.4cqw] border-[0.3cqw] border-sev-critical"
          style={{ left: `${BOX.left}%`, top: `${BOX.top}%`, width: `${BOX.width}%`, height: `${BOX.height}%`, transform: `scale(${0.4 + box * 0.6})`, opacity: box }}
        >
          <span
            className="absolute -top-[2.4cqw] left-[-0.3cqw] origin-bottom-left whitespace-nowrap rounded-[0.3cqw] bg-sev-critical px-[0.6cqw] py-[0.2cqw] font-mono text-[1.2cqw] font-bold text-white"
            style={{ transform: `scale(${label})` }}
          >
            pothole {conf.toFixed(2)}
          </span>
        </div>
      </div>

      <div className="absolute right-[5cqw] top-1/2 w-[28cqw] -translate-y-1/2 space-y-[1.4cqw]">
        <div className="rounded-[1.2cqw] bg-white/5 p-[1.6cqw] ring-1 ring-white/10">
          <div className="flex items-center gap-[0.8cqw] text-[1.4cqw] font-semibold text-white">
            <Cpu className="h-[2cqw] w-[2cqw] text-brand-300" />
            YOLOv8 · {scan < 1 ? t('vid.scanning') : t('vid.done')}
          </div>
          {/* a little neural net lighting up */}
          <div className="mt-[1.2cqw] grid grid-cols-8 gap-[0.6cqw]">
            {Array.from({ length: 24 }).map((_, i) => {
              const on = Math.sin(s * 9 + i * 1.7) > 0.3 && scan < 1;
              return (
                <span
                  key={i}
                  className="aspect-square rounded-full transition-colors duration-150"
                  style={{ background: on ? '#3fbe88' : scan >= 1 ? 'rgba(63,190,136,0.5)' : 'rgba(255,255,255,0.12)' }}
                />
              );
            })}
          </div>
        </div>
        <div className="rounded-[1.2cqw] bg-white p-[1.6cqw] text-ink shadow-xl" style={{ opacity: list, transform: `translateX(${(1 - list) * 4}cqw)` }}>
          <p className="text-[1.2cqw] text-ink-muted">
            {num(1)} {t('vid.found')}
          </p>
          <div className="mt-[0.6cqw] flex items-center justify-between">
            <span className="flex items-center gap-[0.6cqw] text-[1.6cqw] font-bold">
              <span className="h-[1.2cqw] w-[1.2cqw] rounded-full bg-sev-critical" />
              {hazard('pothole', { name: 'Pothole' }).name}
            </span>
            <span className="font-mono text-[1.4cqw]">{num((conf * 100).toFixed(0))}%</span>
          </div>
        </div>
      </div>
    </>
  );
}

function AssessScene({ s, t, num }) {
  const g = ease(seg(s, 0.5, 2.6));
  const score = Math.round(87 * g);
  const angle = -90 + g * 0.87 * 180;
  const band = pop(seg(s, 2.8, 3.4));
  const FACTORS = [
    ['vid.f.size', 72],
    ['vid.f.class', 90],
    ['vid.f.conf', 91],
    ['vid.f.ctx', 80],
  ];

  return (
    <>
      <div className="absolute left-[8cqw] top-1/2 w-[38cqw] -translate-y-1/2 text-center">
        <svg viewBox="0 0 200 120" className="w-full">
          <defs>
            <linearGradient id="gauge" x1="0" x2="1">
              <stop offset="0" stopColor="#16a34a" />
              <stop offset="0.45" stopColor="#f59e0b" />
              <stop offset="0.7" stopColor="#ea580c" />
              <stop offset="1" stopColor="#dc2626" />
            </linearGradient>
          </defs>
          <path d="M 20 105 A 80 80 0 0 1 180 105" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="16" strokeLinecap="round" />
          <path
            d="M 20 105 A 80 80 0 0 1 180 105"
            fill="none"
            stroke="url(#gauge)"
            strokeWidth="16"
            strokeLinecap="round"
            pathLength="100"
            strokeDasharray={`${g * 87} 200`}
            opacity={g > 0.01 ? 1 : 0}
          />
          <g transform={`rotate(${angle} 100 105)`}>
            <line x1="100" y1="105" x2="100" y2="38" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" />
          </g>
          <circle cx="100" cy="105" r="7" fill="#fff" />
        </svg>
        <p className="-mt-[1cqw] font-display text-[6cqw] font-bold leading-none text-white">
          {num(score)}
          <span className="text-[2cqw] text-white/40">/{num(100)}</span>
        </p>
        <p className="mt-[0.6cqw] text-[1.3cqw] text-white/60">{t('vid.severity')}</p>
        <span
          className="mt-[1cqw] inline-block rounded-[0.6cqw] bg-sev-critical px-[1.4cqw] py-[0.4cqw] text-[1.6cqw] font-bold text-white shadow-lg"
          style={{ transform: `scale(${band})` }}
        >
          {t('vid.critical')}
        </span>
      </div>

      <div className="absolute right-[7cqw] top-1/2 w-[36cqw] -translate-y-1/2 space-y-[1.6cqw]">
        {FACTORS.map(([key, value], i) => {
          const p = ease(seg(s, 0.6 + i * 0.4, 1.8 + i * 0.4));
          return (
            <div key={key}>
              <div className="flex justify-between text-[1.4cqw] text-white/80">
                <span>{t(key)}</span>
                <span className="font-mono">{num(Math.round(value * p))}</span>
              </div>
              <div className="mt-[0.5cqw] h-[0.8cqw] overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-gradient-to-r from-brand-400 to-magenta-500" style={{ width: `${value * p}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// A stylised outline of Bangladesh in lng/lat, projected to the SVG below.
const BD_OUTLINE = [
  [88.45, 26.63], [88.73, 26.29], [89.05, 26.4], [89.37, 26.0], [89.83, 25.97], [89.85, 25.29], [90.4, 25.15],
  [91.1, 25.2], [92.0, 25.14], [92.4, 24.85], [92.25, 24.4], [91.85, 24.15], [91.6, 24.15], [91.38, 24.1],
  [91.15, 23.6], [91.2, 23.2], [91.4, 23.0], [91.62, 22.95], [91.8, 23.4], [92.2, 23.7], [92.35, 23.25],
  [92.6, 22.0], [92.65, 21.3], [92.3, 20.75], [92.05, 21.2], [91.85, 22.15], [91.5, 22.55], [91.1, 22.65],
  [90.9, 22.45], [90.6, 22.05], [90.3, 21.85], [89.85, 21.9], [89.1, 21.65], [89.0, 22.05], [88.95, 22.45],
  [89.0, 22.9], [88.75, 23.3], [88.55, 23.65], [88.75, 24.25], [88.15, 24.5], [88.03, 24.68], [88.45, 25.2],
  [88.9, 25.25], [88.6, 25.5], [88.25, 25.8], [88.1, 26.0],
];
const px = (lng) => (lng - 88) * 100;
const py = (lat) => (26.7 - lat) * 100;
const OUTLINE_PATH = `M ${BD_OUTLINE.map(([a, b]) => `${px(a).toFixed(0)} ${py(b).toFixed(0)}`).join(' L ')} Z`;
const PINS = [
  [90.41, 23.81, '#dc2626'], [90.37, 23.75, '#ea580c'], [90.43, 23.71, '#f59e0b'], [90.4, 23.87, '#16a34a'],
  [91.82, 22.36, '#ea580c'], [91.81, 22.33, '#dc2626'], [92.0, 21.43, '#f59e0b'], [91.18, 23.46, '#16a34a'],
  [88.62, 24.36, '#f59e0b'], [89.37, 24.85, '#ea580c'], [89.55, 22.82, '#dc2626'], [89.22, 23.16, '#16a34a'],
  [90.35, 22.7, '#f59e0b'], [89.25, 25.75, '#ea580c'], [88.63, 25.63, '#16a34a'], [90.41, 24.76, '#dc2626'],
  [91.73, 24.31, '#f59e0b'], [89.94, 24.94, '#ea580c'],
];
const NEW_PIN = [91.87, 24.89];

function MapScene({ s, t, num }) {
  const draw = ease(seg(s, 0, 1.4));
  const drop = pop(seg(s, 2.6, 3.2));
  const ripple = seg(s, 3.1, 5.3);
  const count = 73 + (s > 3 ? 1 : 0);

  return (
    <>
      <svg viewBox="-20 -20 510 640" className="absolute left-[10cqw] top-1/2 h-[92%] -translate-y-1/2">
        <path d={OUTLINE_PATH} fill="rgba(0,106,78,0.35)" stroke="#78d8ac" strokeWidth="3" pathLength="100" strokeDasharray={`${draw * 100} 100`} strokeLinejoin="round" />
        {PINS.map(([lng, lat, c], i) => {
          const p = pop(seg(s, 0.8 + i * 0.07, 1.2 + i * 0.07));
          return <circle key={i} cx={px(lng)} cy={py(lat)} r={9 * p} fill={c} stroke="#fff" strokeWidth="2.5" />;
        })}
        <circle cx={px(NEW_PIN[0])} cy={py(NEW_PIN[1])} r={14 + ripple * 60} fill="none" stroke="#f42a41" strokeWidth="3" opacity={ripple ? 1 - ripple : 0} />
        <g transform={`translate(${px(NEW_PIN[0])} ${py(NEW_PIN[1]) - (1 - drop) * 120})`} opacity={s > 2.6 ? 1 : 0}>
          <path d="M0 0 C -14 -18 -20 -28 -20 -40 A 20 20 0 1 1 20 -40 C 20 -28 14 -18 0 0 Z" fill="#f42a41" stroke="#fff" strokeWidth="3" />
          <circle cx="0" cy="-40" r="7" fill="#fff" />
        </g>
      </svg>

      <div className="absolute right-[8cqw] top-1/2 w-[34cqw] -translate-y-1/2 space-y-[1.4cqw]">
        <p className="text-[1.3cqw] font-semibold uppercase tracking-[0.12em] text-brand-300">{t('vid.liveMap')}</p>
        <p className="font-display text-[5cqw] font-bold leading-none text-white">
          {num(count)}
          <span className="ml-[1cqw] text-[1.6cqw] font-medium text-white/50">{t('hero.statReports')}</span>
        </p>
        <div
          className="rounded-[1.2cqw] bg-white p-[1.6cqw] text-ink shadow-xl"
          style={{ opacity: ease(seg(s, 3.2, 3.9)), transform: `translateY(${(1 - ease(seg(s, 3.2, 3.9))) * 3}cqw)` }}
        >
          <p className="text-[1.1cqw] font-semibold uppercase tracking-wide text-magenta-500">{t('vid.newReport')}</p>
          <p className="mt-[0.3cqw] text-[1.6cqw] font-bold">Zindabazar Point, Sylhet</p>
          <p className="mt-[0.4cqw] flex items-center gap-[0.6cqw] text-[1.3cqw]">
            <span className="rounded-[0.4cqw] bg-sev-critical px-[0.6cqw] py-[0.1cqw] font-bold text-white">{num(87)}</span>
            {t('vid.critical')}
          </p>
        </div>
      </div>
    </>
  );
}

function FixScene({ s, t, num, hazard }) {
  const rows = [
    { key: 'a', type: 'open_manhole', place: 'Farmgate, Dhaka', score: 94 },
    { key: 'b', type: 'broken_road', place: 'GEC Circle, Chattogram', score: 81 },
    { key: 'c', type: 'waterlogging', place: 'Shibbari, Khulna', score: 66 },
    { key: 'd', type: 'road_crack', place: 'Zero Point, Rajshahi', score: 34 },
  ];
  const fresh = { key: 'new', type: 'pothole', place: 'Zindabazar, Sylhet', score: 87, fresh: true };
  const slideIn = ease(seg(s, 0.3, 1));
  const sorted = s > 1.8;
  const order = sorted ? [rows[0], fresh, rows[1], rows[2], rows[3]] : [...rows, fresh];
  const assigned = s > 3;
  const resolved = s > 4.6;
  const end = ease(seg(s, 6, 6.9));
  const color = (v) => (v > 80 ? '#dc2626' : v > 60 ? '#ea580c' : v > 30 ? '#f59e0b' : '#16a34a');

  return (
    <>
      <div className="absolute left-1/2 top-1/2 w-[62cqw] -translate-x-1/2 -translate-y-1/2" style={{ opacity: 1 - end * 0.85, transform: `translate(-50%,-50%) scale(${1 - end * 0.06})` }}>
        <p className="mb-[1.2cqw] flex items-center gap-[0.8cqw] text-[1.5cqw] font-semibold text-white">
          <Wrench className="h-[2cqw] w-[2cqw] text-brand-300" />
          {t('vid.queue')}
        </p>
        <div className="relative" style={{ height: '29cqw' }}>
          {order.map((row, i) => {
            const isNew = row.fresh;
            return (
              <div
                key={row.key}
                className={`absolute inset-x-0 flex items-center gap-[1.2cqw] rounded-[1cqw] px-[1.4cqw] text-ink shadow-lg transition-all duration-700 ease-out ${
                  isNew ? 'bg-white ring-[0.3cqw] ring-magenta-500' : 'bg-white/95'
                }`}
                style={{
                  top: `${i * 5.8}cqw`,
                  height: '5cqw',
                  opacity: isNew ? slideIn : 1,
                  transform: isNew ? `translateX(${(1 - slideIn) * 20}cqw)` : 'none',
                }}
              >
                <span className="font-mono text-[1.3cqw] text-ink-muted">#{num(i + 1)}</span>
                <span className="h-[1.2cqw] w-[1.2cqw] rounded-full" style={{ background: color(row.score) }} />
                <span className="text-[1.5cqw] font-bold">{hazard(row.type, { name: row.type }).name}</span>
                <span className="truncate text-[1.3cqw] text-ink-muted">{row.place}</span>
                <span className="ml-auto flex items-center gap-[0.8cqw]">
                  {isNew && assigned && (
                    <span
                      className={`flex items-center gap-[0.4cqw] rounded-full px-[0.9cqw] py-[0.2cqw] text-[1.1cqw] font-semibold ${
                        resolved ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-900'
                      }`}
                    >
                      {resolved ? <CheckCircle2 className="h-[1.3cqw] w-[1.3cqw]" /> : <Wrench className="h-[1.3cqw] w-[1.3cqw]" />}
                      {resolved ? t('vid.resolved') : t('vid.assigned')}
                    </span>
                  )}
                  <span className="rounded-[0.4cqw] px-[0.6cqw] py-[0.1cqw] font-mono text-[1.3cqw] font-bold text-white" style={{ background: color(row.score) }}>
                    {num(row.score)}
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {end > 0 && (
        <div className="absolute inset-0 grid place-items-center bg-night-950/70 backdrop-blur-sm" style={{ opacity: end }}>
          <div className="text-center" style={{ transform: `translateY(${(1 - end) * 3}cqw)` }}>
            <p className="font-bangla text-[7cqw] leading-none text-white">দৃষ্টি</p>
            <p className="mt-[1.6cqw] font-display text-[3cqw] font-bold text-white">{t('vid.end')}</p>
            <p className="mt-[0.8cqw] text-[1.6cqw] text-gradient">{t('foot.tagline')}</p>
            <p className="mt-[1.4cqw] font-bangla text-[3.2cqw] text-magenta-400" lang="bn">সবার আগে বাংলাদেশ</p>
          </div>
        </div>
      )}
    </>
  );
}

const SCENES = {
  capture: CaptureScene,
  upload: UploadScene,
  detect: DetectScene,
  assess: AssessScene,
  map: MapScene,
  fix: FixScene,
};

/* ------------------------------------------------------------ player */

export default function ProcessVideo() {
  const { t, num, hazard } = useLang();
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const timeRef = useRef(0);
  const rootRef = useRef(null);
  const startedRef = useRef(false);

  const seek = useCallback((value) => {
    timeRef.current = Math.min(TOTAL, Math.max(0, value));
    setTime(timeRef.current);
  }, []);

  // The clock.
  useEffect(() => {
    if (!playing) return undefined;
    let raf;
    let last = performance.now();
    const tick = (now) => {
      const dt = (now - last) / 1000;
      last = now;
      const next = timeRef.current + dt;
      if (next >= TOTAL) {
        seek(TOTAL);
        setPlaying(false);
        return;
      }
      seek(next);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, seek]);

  // Autoplay the first time it is seen; pause when scrolled away.
  useEffect(() => {
    const node = rootRef.current;
    if (!node) return undefined;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !startedRef.current && !reduce) {
          startedRef.current = true;
          setPlaying(true);
        } else if (!entry.isIntersecting) {
          setPlaying(false);
        }
      },
      { threshold: 0.45 }
    );
    io.observe(node);
    return () => io.disconnect();
  }, []);

  // "Watch how it works" buttons elsewhere on the page start it from the top.
  useEffect(() => {
    const play = () => {
      startedRef.current = true;
      seek(0);
      setPlaying(true);
    };
    window.addEventListener('drishti:play-video', play);
    return () => window.removeEventListener('drishti:play-video', play);
  }, [seek]);

  const togglePlay = () => {
    if (time >= TOTAL) seek(0);
    setPlaying((p) => !p);
  };

  const chapterIndex = Math.max(0, CHAPTERS.findIndex((c) => time >= c.start && time < c.end));
  const current = CHAPTERS[time >= TOTAL ? CHAPTERS.length - 1 : chapterIndex];

  const sceneOpacity = (c) => {
    const fadeIn = c.start === 0 ? 1 : seg(time, c.start - 0.15, c.start + 0.35);
    const fadeOut = c.end === TOTAL ? 1 : 1 - seg(time, c.end - 0.35, c.end + 0.15);
    return Math.min(fadeIn, fadeOut);
  };

  const fmt = (v) => num(`${Math.floor(v / 60)}:${String(Math.floor(v % 60)).padStart(2, '0')}`);

  return (
    <div ref={rootRef} className="overflow-hidden rounded-[1.5rem] bg-night-950 shadow-lift ring-1 ring-ink-line">
      {/* stage */}
      <div
        className="relative aspect-video w-full cursor-pointer select-none overflow-hidden text-white"
        style={{ containerType: 'inline-size' }}
        onClick={togglePlay}
        role="img"
        aria-label={`${t(current.label)}: ${t(`vid.${current.key}`)}`}
      >
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-70" />
        <div className="pointer-events-none absolute -left-[10cqw] -top-[20cqw] h-[50cqw] w-[50cqw] rounded-full bg-brand-600/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-[25cqw] -right-[10cqw] h-[45cqw] w-[45cqw] rounded-full bg-magenta-500/15 blur-3xl" />

        {CHAPTERS.map((c) => {
          const opacity = sceneOpacity(c);
          if (opacity <= 0) return null;
          const Scene = SCENES[c.key];
          return (
            <div key={c.key} className="absolute inset-0" style={{ opacity }}>
              <Scene s={time - c.start} t={t} num={num} hazard={hazard} />
            </div>
          );
        })}

        {/* chapter chip */}
        <div className="absolute left-[2cqw] top-[2cqw] flex items-center gap-[0.8cqw] rounded-full bg-black/40 px-[1.2cqw] py-[0.5cqw] text-[1.3cqw] font-semibold backdrop-blur">
          <span className="grid h-[2cqw] w-[2cqw] place-items-center rounded-full bg-brand-600 text-[1.1cqw]">
            {num(CHAPTERS.indexOf(current) + 1)}
          </span>
          {t(current.label)}
        </div>

        {/* caption */}
        <div className="absolute inset-x-0 bottom-[2.4cqw] flex justify-center px-[4cqw]">
          <p
            key={current.key}
            className="animate-fade-up rounded-[0.8cqw] bg-black/60 px-[1.6cqw] py-[0.7cqw] text-center text-[1.55cqw] leading-snug text-white backdrop-blur"
          >
            {t(`vid.${current.key}`)}
          </p>
        </div>

        {/* big play button when paused */}
        {!playing && time >= TOTAL && (
          <span className="absolute bottom-[7cqw] right-[3cqw] flex items-center gap-[0.6cqw] rounded-full bg-white/95 px-[1.6cqw] py-[0.8cqw] text-[1.4cqw] font-semibold text-brand-700 shadow-2xl">
            <RotateCcw className="h-[1.8cqw] w-[1.8cqw]" />
            {t('vid.replay')}
          </span>
        )}
        {!playing && time < TOTAL && (
          <div className="absolute inset-0 grid place-items-center bg-black/25">
            <span className="grid h-[9cqw] w-[9cqw] place-items-center rounded-full bg-white/95 text-brand-700 shadow-2xl transition-transform hover:scale-105">
              {time >= TOTAL ? <RotateCcw className="h-[4cqw] w-[4cqw]" /> : <Play className="ml-[0.6cqw] h-[4cqw] w-[4cqw]" fill="currentColor" />}
            </span>
          </div>
        )}
      </div>

      {/* controls */}
      <div className="flex items-center gap-3 border-t border-white/10 bg-night-900 px-3 py-2.5 text-white sm:px-4">
        <button
          type="button"
          onClick={togglePlay}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
          aria-label={playing ? t('vid.pause') : time >= TOTAL ? t('vid.replay') : t('vid.play')}
        >
          {playing ? <Pause className="h-4 w-4" fill="currentColor" /> : time >= TOTAL ? <RotateCcw className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" fill="currentColor" />}
        </button>

        <div className="flex min-w-0 flex-1 gap-1" role="group" aria-label={t('vid.chapters')}>
          {CHAPTERS.map((c, i) => {
            const fill = seg(time, c.start, c.end);
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => {
                  seek(c.start);
                  setPlaying(true);
                }}
                className="group flex-1 py-2"
                style={{ flexGrow: c.end - c.start }}
                title={t(c.label)}
                aria-label={`${num(i + 1)}. ${t(c.label)}`}
              >
                <span className="block h-1.5 overflow-hidden rounded-full bg-white/15 transition-all group-hover:h-2">
                  <span className="block h-full rounded-full bg-gradient-to-r from-brand-400 to-magenta-500" style={{ width: `${fill * 100}%` }} />
                </span>
              </button>
            );
          })}
        </div>

        <span className="hidden shrink-0 font-mono text-xs text-white/60 sm:block">
          {fmt(Math.min(time, TOTAL))} / {fmt(TOTAL)}
        </span>
        <Link to="/report" className="btn-primary hidden shrink-0 px-3 py-1.5 text-xs md:inline-flex">
          <Camera className="h-3.5 w-3.5" aria-hidden="true" />
          {t('nav.reportHazard')}
        </Link>
      </div>
    </div>
  );
}
