import { t } from './i18n.ts';
import './play.css';
import './home.css';
import { initializeLanguage } from './i18n.ts';
import { DIFFICULTIES, type Difficulty } from './game.ts';
import { initializeShell, showToast } from './ui.ts';

initializeShell('home');

const difficultyDescriptions: Record<Difficulty, { en: string; bg: string }> = {
  relaxed: { en: 'Take your time exploring every panorama.', bg: 'Разглеждай всяка панорама без бързане.' },
  easy: { en: 'A generous timer gives you room to explore.', bg: 'Щедрото време ти дава възможност да разгледаш.' },
  normal: { en: 'Balance careful exploring with a steady pace.', bg: 'Съчетай внимателното разглеждане с добро темпо.' },
  hard: { en: 'Make each move count with a short timer.', bg: 'Използвай всеки ход разумно с кратък таймер.' },
  expert: { en: 'Trust your instincts and decide quickly.', bg: 'Довери се на усета си и решавай бързо.' },
};
const difficultyNames: Record<Difficulty, { en: string; bg: string }> = {
  relaxed: { en: 'Relaxed', bg: 'Спокойно' }, easy: { en: 'Easy', bg: 'Лесно' },
  normal: { en: 'Normal', bg: 'Нормално' }, hard: { en: 'Hard', bg: 'Трудно' },
  expert: { en: 'Expert', bg: 'Експерт' },
};
const difficultyCards = document.querySelector<HTMLElement>('#difficulty-cards')!;
for (const [index, [key, seconds]] of Object.entries(DIFFICULTIES).entries()) {
  const level = key as Difficulty;
  const card = document.createElement('article');
  card.className = `card difficulty-card difficulty-${level}`;
  card.innerHTML = `<div class="difficulty-card-heading"><h3 data-en="${difficultyNames[level].en}" data-bg="${difficultyNames[level].bg}"></h3><span class="difficulty-bars" aria-hidden="true">${Array.from({ length: 5 }, (_, bar) => `<i${bar < index + 1 ? ' class="active"' : ''}></i>`).join('')}</span></div>
    <p class="difficulty-time" data-en="${seconds === null ? 'No time limit' : `${seconds} seconds`} / round" data-bg="${seconds === null ? 'Без ограничение' : `${seconds} секунди`} / рунд"></p>
    <p class="difficulty-description" data-en="${difficultyDescriptions[level].en}" data-bg="${difficultyDescriptions[level].bg}"></p>`;
  difficultyCards.append(card);
}

const form = document.querySelector<HTMLFormElement>('#start')!;
const play = form.querySelector('button')!;
const status = document.querySelector('#start-status')!;
const difficulty = document.querySelector<HTMLSelectElement>('#difficulty')!;
function updateDifficulty() {
  for (const option of difficulty.options) option.textContent = t(option.value[0].toUpperCase() + option.value.slice(1));
  const seconds = DIFFICULTIES[difficulty.value as Difficulty];
  document.querySelector('#difficulty-help')!.textContent = seconds === null ? t('Unlimited time') : seconds + ' ' + t('s') + ' / ' + t('Round');
}
difficulty.onchange = updateDifficulty;
window.addEventListener('languagechange', updateDifficulty);
initializeLanguage();
updateDifficulty();
const settings = document.querySelector<HTMLDialogElement>('#settings-dialog')!;
let gameModule: Promise<typeof import('./play.ts')> | undefined;
function loadGame() {
  return gameModule ??= import('./play.ts').catch(error => {
    gameModule = undefined;
    throw error;
  });
}
document.querySelector<HTMLButtonElement>('#open-settings')!.onclick = () => {
  settings.showModal();
  // Load only after play intent, while the player chooses mode and difficulty.
  void loadGame().catch(() => {});
};
document.querySelector<HTMLButtonElement>('#close-settings')!.onclick = () => settings.close();

form.onsubmit = async event => {
  event.preventDefault();
  if (play.disabled) return;
  const mode = new FormData(form).get('mode') === 'no-move' ? 'no-move' : 'classic';
  play.disabled = true;
  status.textContent = t('Loading the game…');
  try {
    const { startGame } = await loadGame();
    settings.close();
    startGame(mode, difficulty.value as Difficulty);
    status.textContent = '';
  } catch {
    status.textContent = t('The game could not load. Check your connection and try again.');
    showToast(status.textContent);
  } finally {
    play.disabled = false;
  }
};

