import './design.css';
import { Logo } from './Logo.ts';
import { initializeAccount } from './account-entry.ts';
import { accountMarkup } from './account-markup.ts';
import { t, translatePage } from './i18n.ts';

type Page = 'home' | 'leaderboard' | 'lab';
const paths = {
  compass: '<circle cx="12" cy="12" r="9"/><path d="m16 8-2.5 5.5L8 16l2.5-5.5Z"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  trophy: '<path d="M8 3h8v6a4 4 0 0 1-8 0Zm0 2H4v2a4 4 0 0 0 4 4m8-6h4v2a4 4 0 0 1-4 4m-4 2v6m-4 2h8"/>',
};
export function icon(name: keyof typeof paths) {
  return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
}

/** Shared semantic shell. Screen controllers retain their existing IDs. */
export function initializeShell(page: Page) {
  document.body.dataset.page = page;
  const header = document.querySelector<HTMLElement>('.masthead') ?? document.createElement('header');
  header.className = 'masthead';
  if (!header.isConnected) document.body.prepend(header);
  header.innerHTML = `${Logo()}
    <nav class="header-actions" aria-label="GeoQuest">
      <a href="./" ${page === 'home' ? 'aria-current="page"' : ''} data-en="Play" data-bg="Играй">Play</a>
      <a href="./leaderboard.html" ${page === 'leaderboard' ? 'aria-current="page"' : ''} data-en="Leaderboard" data-bg="Класация">Leaderboard</a>
      ${page === 'home' ? '<p id="progress" data-dynamic hidden></p><output id="timer" data-dynamic hidden></output>' : ''}
      <button data-dynamic id="open-account" type="button" hidden>Account</button>
      <button id="language" type="button" aria-label="Language / Език">EN</button>
    </nav>`;
  const main = document.querySelector('main')!;
  if (!main.id) main.id = 'main-content';
  const skip = document.createElement('a'); skip.href = '#' + main.id; skip.className = 'skip-link';
  skip.dataset.en = 'Skip to content'; skip.dataset.bg = 'Към съдържанието'; skip.textContent = 'Skip to content';
  skip.addEventListener('click', event => {
    event.preventDefault();
    const target = main.querySelector<HTMLElement>('.home:not([hidden]),.stage:not([hidden])') ?? main;
    target.tabIndex = -1; target.focus(); target.scrollIntoView();
  });
  document.body.prepend(skip);
  const footer = document.createElement('footer'); footer.className = 'site-footer';
  footer.innerHTML = '<span>© 2026 GeoQuest Bulgaria</span><span data-en="Learn. Discover. Play." data-bg="Учи. Откривай. Играй.">Learn. Discover. Play.</span>';
  document.body.append(footer);
  document.body.insertAdjacentHTML('beforeend', accountMarkup);
  if (!document.getElementById('personal-best')) {
    const context = document.createElement('div'); context.hidden = true;
    context.innerHTML = '<p id="personal-best" data-dynamic hidden></p>'; document.body.append(context);
  }
  for (const element of document.querySelectorAll<HTMLElement>('[data-icon]')) {
    element.innerHTML = icon(element.dataset.icon as keyof typeof paths);
  }
  for (const dialog of document.querySelectorAll('dialog')) {
    dialog.classList.add('modal');
    dialog.addEventListener('click', event => {
      const rect = dialog.getBoundingClientRect();
      if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
    });
  }
  // Measure wrapped mobile navigation instead of assuming a fixed header height.
  new ResizeObserver(([entry]) => {
    document.documentElement.style.setProperty('--header-height', `${entry.target.getBoundingClientRect().height}px`);
  }).observe(header);
  initializeAccount();
}

/** Nonblocking notifications; form validation stays next to its field. */
export function showToast(message: string) {
  let region = document.getElementById('toast-region');
  if (!region) {
    region = document.createElement('div'); region.id = 'toast-region'; region.className = 'toast-region';
    region.setAttribute('aria-live', 'polite'); document.body.append(region);
  }
  const toast = document.createElement('div'); toast.className = 'toast card';
  const copy = document.createElement('span'); copy.textContent = message;
  const close = document.createElement('button'); close.type = 'button'; close.textContent = t('Close');
  close.onclick = () => toast.remove(); toast.append(copy, close); region.append(toast);
  setTimeout(() => toast.remove(), 7000);
}

