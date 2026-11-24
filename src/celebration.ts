import { t, lang } from './i18n.ts';
let frame = 0;
let finish: ReturnType<typeof setTimeout> | undefined;
export function stopCelebration() {
  cancelAnimationFrame(frame); clearTimeout(finish);
  document.getElementById('celebration')!.hidden = true;
  document.getElementById('confetti')!.replaceChildren();
}
// Only a successful submit calls this; re-rendering never replays celebrations.
export function celebratePerfect() {
  stopCelebration();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const panel = document.getElementById('celebration')!;
  const counter = document.getElementById('perfect-count')!;
  document.getElementById('perfect-message')!.textContent = t('PERFECT SCORE!');
  panel.hidden = false;
  if (!reduced) {
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < 36; i++) {
      const piece = document.createElement('i');
      piece.style.cssText = `--x:${(i * 37) % 100}%;--delay:${(i % 6) * 60}ms;--rotation:${i * 67}deg;background:${i % 2 ? '#a5ebc5' : '#eac969'}`;
      fragment.append(piece);
    }
    document.getElementById('confetti')!.append(fragment);
  }
  const start = performance.now();
  function count(now: number) {
    const progress = Math.min(1, (now - start) / 1000);
    counter.textContent = new Intl.NumberFormat(lang()).format(Math.round(5000 * (1 - (1 - progress) ** 3)));
    if (progress < 1) frame = requestAnimationFrame(count);
  }
  if (reduced) counter.textContent = new Intl.NumberFormat(lang()).format(5000);
  else frame = requestAnimationFrame(count);
  finish = setTimeout(stopCelebration, 2700);
}
