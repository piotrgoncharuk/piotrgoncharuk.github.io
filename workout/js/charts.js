// Простые SVG-графики без внешних библиотек.
import { h } from './ui.js';

const NS = 'http://www.w3.org/2000/svg';
function s(tag, attrs = {}) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

export function barChart(data, { height = 160, format = v => v, color = 'var(--accent)' } = {}) {
  const wrap = h('div', { class: 'chart' });
  const svg = s('svg', { viewBox: `0 0 320 ${height}`, preserveAspectRatio: 'none', class: 'chart-svg' });
  const max = Math.max(1, ...data.map(d => d.value));
  const n = data.length || 1;
  const gap = 8, w = (320 - gap * (n - 1)) / n;
  data.forEach((d, i) => {
    const bh = Math.max(2, (d.value / max) * (height - 34));
    const x = i * (w + gap);
    svg.appendChild(s('rect', { x, y: height - 22 - bh, width: w, height: bh, rx: Math.min(6, w / 2), fill: d.value ? color : 'var(--line)' }));
    const t = s('text', { x: x + w / 2, y: height - 8, 'text-anchor': 'middle', class: 'chart-label' });
    t.textContent = d.label;
    svg.appendChild(t);
    if (d.value) {
      const vt = s('text', { x: x + w / 2, y: height - 28 - bh, 'text-anchor': 'middle', class: 'chart-value' });
      vt.textContent = format(d.value);
      svg.appendChild(vt);
    }
  });
  wrap.appendChild(svg);
  return wrap;
}

export function lineChart(points, { height = 170, format = v => v } = {}) {
  const wrap = h('div', { class: 'chart' });
  if (points.length < 2) {
    wrap.appendChild(h('p', { class: 'muted small', text: 'Нужно минимум две точки для графика.' }));
    return wrap;
  }
  const svg = s('svg', { viewBox: `0 0 320 ${height}`, class: 'chart-svg' });
  const ys = points.map(p => p.y);
  const min = Math.min(...ys), max = Math.max(...ys);
  const pad = (max - min) * 0.15 || Math.max(1, max * 0.05);
  const lo = min - pad, hi = max + pad;
  const X = i => 8 + (i / (points.length - 1)) * 304;
  const Y = v => height - 26 - ((v - lo) / (hi - lo || 1)) * (height - 46);

  const d = points.map((p, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(p.y).toFixed(1)}`).join(' ');
  const area = `${d} L${X(points.length - 1).toFixed(1)},${height - 26} L${X(0).toFixed(1)},${height - 26} Z`;

  const grad = s('linearGradient', { id: 'lcg', x1: '0', y1: '0', x2: '0', y2: '1' });
  grad.appendChild(s('stop', { offset: '0%', 'stop-color': 'var(--accent)', 'stop-opacity': '0.35' }));
  grad.appendChild(s('stop', { offset: '100%', 'stop-color': 'var(--accent)', 'stop-opacity': '0' }));
  const defs = s('defs'); defs.appendChild(grad); svg.appendChild(defs);

  svg.appendChild(s('path', { d: area, fill: 'url(#lcg)' }));
  svg.appendChild(s('path', { d, fill: 'none', stroke: 'var(--accent)', 'stroke-width': '2.5', 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
  points.forEach((p, i) => {
    svg.appendChild(s('circle', { cx: X(i), cy: Y(p.y), r: 3.5, fill: 'var(--bg-card)', stroke: 'var(--accent)', 'stroke-width': '2' }));
  });
  [points[0], points[points.length - 1]].forEach((p, k) => {
    const i = k === 0 ? 0 : points.length - 1;
    const t = s('text', { x: X(i), y: height - 8, 'text-anchor': k === 0 ? 'start' : 'end', class: 'chart-label' });
    t.textContent = p.label;
    svg.appendChild(t);
  });
  const tmax = s('text', { x: 8, y: 14, class: 'chart-value' }); tmax.textContent = format(max);
  svg.appendChild(tmax);
  wrap.appendChild(svg);
  return wrap;
}

export function donut(parts, { size = 132, thickness = 16 } = {}) {
  const total = parts.reduce((a, p) => a + p.value, 0) || 1;
  const r = (size - thickness) / 2, c = 2 * Math.PI * r;
  const svg = s('svg', { viewBox: `0 0 ${size} ${size}`, width: size, height: size, class: 'donut' });
  let offset = 0;
  svg.appendChild(s('circle', { cx: size / 2, cy: size / 2, r, fill: 'none', stroke: 'var(--line)', 'stroke-width': thickness }));
  parts.forEach(p => {
    const len = (p.value / total) * c;
    const circle = s('circle', {
      cx: size / 2, cy: size / 2, r, fill: 'none', stroke: p.color, 'stroke-width': thickness,
      'stroke-dasharray': `${len} ${c - len}`, 'stroke-dashoffset': -offset,
      transform: `rotate(-90 ${size / 2} ${size / 2})`, 'stroke-linecap': 'butt'
    });
    svg.appendChild(circle);
    offset += len;
  });
  return svg;
}
