// Карточка тренировки картинкой: поделиться или сохранить в фото.
import * as S from './store.js';
import { fmtDuration, fmtNum, toast } from './ui.js';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Рисует итоговую карточку тренировки. */
export function renderCard(session) {
  const W = 1080, H = 1350;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');

  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, '#1b2440');
  grad.addColorStop(0.55, '#12172a');
  grad.addColorStop(1, '#0d1018');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = 'rgba(79,140,255,0.16)';
  ctx.beginPath(); ctx.arc(W - 60, 120, 260, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(34,197,94,0.12)';
  ctx.beginPath(); ctx.arc(80, H - 120, 220, 0, Math.PI * 2); ctx.fill();

  const font = (size, weight = '700') => `${weight} ${size}px -apple-system, "SF Pro Display", "Segoe UI", Roboto, sans-serif`;
  const isFootball = session.kind === 'football';
  const date = new Date(session.endedAt || session.startedAt);

  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = font(34, '600');
  ctx.fillText(date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase(), 80, 140);

  ctx.fillStyle = '#ffffff';
  ctx.font = font(72);
  wrapText(ctx, session.title, 80, 240, W - 160, 82);

  const stats = isFootball
    ? [
        [String(session.minutes || 0) + ' мин', 'на поле'],
        [String(session.rpe || '—'), 'тяжесть 1–10'],
        [String(session.goals || 0), 'голов'],
        [String(session.assists || 0), 'передач'],
        [session.distance ? fmtNum(session.distance, 1) + ' км' : '—', 'дистанция'],
        [String(S.sessionLoad(session)), 'нагрузка']
      ]
    : [
        [fmtDuration(S.sessionDuration(session)), 'длительность'],
        [String(S.sessionSets(session)), 'подходов'],
        [fmtNum(S.sessionVolume(session)) + ' кг', 'тоннаж'],
        [String(S.sessionReps(session)), 'повторов'],
        [String((session.items || []).length), 'упражнений'],
        [String(S.sessionLoad(session)), 'нагрузка']
      ];

  const cols = 2, cw = (W - 160 - 40) / cols, chh = 190;
  stats.forEach(([value, label], i) => {
    const x = 80 + (i % cols) * (cw + 40);
    const y = 460 + Math.floor(i / cols) * (chh + 30);
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    roundRect(ctx, x, y, cw, chh, 28); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = font(58);
    ctx.fillText(String(value), x + 36, y + 100);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = font(30, '500');
    ctx.fillText(label, x + 36, y + 148);
  });

  // подпись
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.font = font(30, '600');
  const who = S.activeProfile()?.name || '';
  ctx.fillText(who ? `${who} · Тренировки` : 'Тренировки', 80, H - 80);

  ctx.fillStyle = '#4f8cff';
  roundRect(ctx, W - 200, H - 130, 120, 70, 22); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = font(38);
  ctx.fillText('🏋️', W - 175, H - 80);

  return c;
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = String(text).split(' ');
  let line = '', ly = y;
  words.forEach(w => {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxWidth && line) { ctx.fillText(line, x, ly); line = w; ly += lineHeight; }
    else line = test;
  });
  if (line) ctx.fillText(line, x, ly);
}

/** Поделиться карточкой или сохранить её в файл. */
export async function shareSession(session) {
  try {
    const canvas = renderCard(session);
    const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.92));
    if (!blob) throw new Error('Не удалось создать изображение');
    const file = new File([blob], 'trenirovka.jpg', { type: 'image/jpeg' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: session.title });
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'trenirovka.jpg';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    toast('Картинка сохранена');
  } catch (e) {
    if (e && e.name === 'AbortError') return;      // пользователь закрыл окно «Поделиться»
    toast('Не получилось поделиться');
  }
}
