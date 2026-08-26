// Мелкие помощники для интерфейса.

export function h(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'text') el.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else el.setAttribute(k, v);
  }
  (Array.isArray(children) ? children : [children]).forEach(c => {
    if (c === null || c === undefined || c === false) return;
    el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
  });
  return el;
}

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function fmtDate(ts) {
  return new Date(ts).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}
export function fmtDateShort(ts) {
  return new Date(ts).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
}
export function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}
export function fmtDuration(sec) {
  sec = Math.round(sec);
  const h_ = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  if (h_) return `${h_} ч ${m} мин`;
  if (m) return `${m} мин${s && m < 5 ? ' ' + s + ' с' : ''}`;
  return `${s} с`;
}
export function mmss(sec) {
  sec = Math.max(0, Math.round(sec));
  return `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
}
export function fmtNum(n, digits = 0) {
  if (!isFinite(n)) return '0';
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: digits }).format(n);
}
export function plural(n, one, few, many) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
  return many;
}

// ------------------------------------------------------------------ тосты
let toastHost;
export function toast(msg, type = '') {
  if (!toastHost) {
    toastHost = h('div', { class: 'toast-host' });
    document.body.appendChild(toastHost);
  }
  const t = h('div', { class: `toast ${type}`, text: msg });
  toastHost.appendChild(t);
  requestAnimationFrame(() => t.classList.add('in'));
  setTimeout(() => { t.classList.remove('in'); setTimeout(() => t.remove(), 300); }, 2600);
}

// ------------------------------------------------------------------ модальные шторки
export function sheet(title, contentNode, { actions = [], wide = false } = {}) {
  const back = h('div', { class: 'sheet-back' });
  const panel = h('div', { class: 'sheet' + (wide ? ' wide' : '') }, [
    h('div', { class: 'sheet-grip' }),
    h('div', { class: 'sheet-head' }, [
      h('h3', { text: title }),
      h('button', { class: 'icon-btn', 'aria-label': 'Закрыть', html: '&times;', onClick: close })
    ]),
    h('div', { class: 'sheet-body' }, [contentNode]),
    actions.length ? h('div', { class: 'sheet-actions' }, actions) : null
  ]);
  back.appendChild(panel);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  document.body.appendChild(back);
  document.body.classList.add('no-scroll');
  requestAnimationFrame(() => back.classList.add('in'));
  function close() {
    back.classList.remove('in');
    document.body.classList.remove('no-scroll');
    setTimeout(() => back.remove(), 250);
  }
  return { close, panel };
}

export function confirmDialog(title, text, okLabel = 'Да') {
  return new Promise(resolve => {
    let done = false;
    const s = sheet(title, h('p', { class: 'muted', text }), {
      actions: [
        h('button', { class: 'btn ghost', text: 'Отмена', onClick: () => { done = true; s.close(); resolve(false); } }),
        h('button', { class: 'btn danger', text: okLabel, onClick: () => { done = true; s.close(); resolve(true); } })
      ]
    });
    const obs = new MutationObserver(() => {
      if (!document.body.contains(s.panel) && !done) { done = true; obs.disconnect(); resolve(false); }
    });
    obs.observe(document.body, { childList: true });
  });
}

export function promptDialog(title, { label = '', value = '', placeholder = '', type = 'text', hint = '' } = {}) {
  return new Promise(resolve => {
    const input = h('input', { class: 'input', type, value, placeholder });
    const s = sheet(title, h('div', { class: 'stack' }, [
      label ? h('label', { class: 'label', text: label }) : null,
      input,
      hint ? h('p', { class: 'muted small', text: hint }) : null
    ]), {
      actions: [
        h('button', { class: 'btn ghost', text: 'Отмена', onClick: () => { s.close(); resolve(null); } }),
        h('button', { class: 'btn', text: 'Сохранить', onClick: () => { s.close(); resolve(input.value); } })
      ]
    });
    setTimeout(() => input.focus(), 250);
  });
}

// ------------------------------------------------------------------ видео
export function parseVideo(url) {
  if (!url) return null;
  const u = String(url).trim();
  let m;
  if ((m = u.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{6,})/)))
    return { kind: 'youtube', id: m[1], embed: `https://www.youtube-nocookie.com/embed/${m[1]}?rel=0&playsinline=1`, open: `https://www.youtube.com/watch?v=${m[1]}` };
  if ((m = u.match(/vimeo\.com\/(?:video\/)?(\d+)/)))
    return { kind: 'vimeo', id: m[1], embed: `https://player.vimeo.com/video/${m[1]}`, open: u };
  if (/\.(mp4|webm|ogg|mov)(\?|$)/i.test(u)) return { kind: 'file', embed: u, open: u };
  return { kind: 'link', embed: null, open: u };
}

export function videoSearchUrl(query) {
  return 'https://www.youtube.com/results?search_query=' + encodeURIComponent(query);
}

export function videoPlayer(url) {
  const v = parseVideo(url);
  if (!v) return null;
  if (v.kind === 'file') return h('video', { class: 'video-frame', src: v.embed, controls: '', playsinline: '' });
  if (v.embed) return h('iframe', {
    class: 'video-frame', src: v.embed, allow: 'accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen',
    allowfullscreen: '', loading: 'lazy', referrerpolicy: 'strict-origin-when-cross-origin', title: 'Видео-инструкция'
  });
  return h('a', { class: 'btn block', href: v.open, target: '_blank', rel: 'noopener', text: 'Открыть видео' });
}

// ------------------------------------------------------------------ прочее
export function segmented(options, current, onChange) {
  const wrap = h('div', { class: 'segmented' });
  options.forEach(o => wrap.appendChild(h('button', {
    class: 'seg' + (o.value === current ? ' active' : ''),
    text: o.label,
    onClick: () => onChange(o.value)
  })));
  return wrap;
}

export function statTile(value, label, sub = '') {
  return h('div', { class: 'stat' }, [
    h('div', { class: 'stat-value', text: value }),
    h('div', { class: 'stat-label', text: label }),
    sub ? h('div', { class: 'stat-sub', text: sub }) : null
  ]);
}

export function emptyState(icon, title, text, action) {
  return h('div', { class: 'empty' }, [
    h('div', { class: 'empty-icon', text: icon }),
    h('h3', { text: title }),
    h('p', { class: 'muted', text: text }),
    action || null
  ]);
}

export function haptic(pattern = 12) {
  try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) {}
}
