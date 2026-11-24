import { initializeShell } from './ui.ts';
import './leaderboard.css';
import { createClient } from '@supabase/supabase-js';
import { AUTH_STORAGE_KEY, supabaseUrl, supabaseKey } from './account-entry.ts';
import { initializeLanguage, lang as language } from './i18n.ts';
const text = (en: string, bg: string) => language() === 'bg' ? bg : en;

interface Entry { rank: number; player_id: string; username: string | null; avatar_url: string | null; score: number; mode: string; difficulty: string | null; achieved_at: string; verification: string }
interface Board { rows: Entry[]; podium: Entry[]; total: number; personal: Entry | null; best: number | null; completed_games: number }
const el = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const client = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey, { auth: { storageKey: AUTH_STORAGE_KEY } }) : undefined;
let offset = 0, request = 0;
let currentUser: string | undefined;
let currentBoard: Board | undefined;
let controller: AbortController | undefined;
const format = (n: number) => new Intl.NumberFormat(language()).format(n);
const modeName = (mode: string) => mode === 'classic' ? text('Classic','Класически') : text('No Move','Без движение');
function node(tag: string, value: string, className = '') {
  const item = document.createElement(tag); item.textContent = value; item.className = className; return item;
}
function name(entry: Entry) { return entry.username ?? text('Unnamed explorer','Изследовател без име'); }
function avatar(entry: Entry) {
  const fallback = node('span', entry.username?.slice(0,2).toUpperCase() ?? 'GQ', 'avatar');
  if (entry.avatar_url?.startsWith('https://')) {
    const img = document.createElement('img'); img.src = entry.avatar_url; img.alt = ''; img.referrerPolicy = 'no-referrer'; img.loading = 'lazy';
    img.onerror = () => img.remove(); fallback.replaceChildren(img);
  }
  return fallback;
}
function render(data: Board) {
  el('podium').replaceChildren(); el('rankings').replaceChildren();
  for (const entry of data.podium) {
    const card = node('article','',`card podium-card place-${entry.rank}`);
    card.setAttribute('aria-label',`${text('Rank','Място')} ${entry.rank}: ${name(entry)}`);
    if (entry.player_id === currentUser) card.classList.add('is-you');
    card.append(node('span', ['Ⅰ','Ⅱ','Ⅲ'][entry.rank-1], 'medal'), avatar(entry), node('h2', name(entry)), node('strong',format(entry.score),'podium-score score-display'), node('small',modeName(entry.mode)), node('span',entry.verification === 'verified' ? text('Verified','Проверен') : text('Unverified','Непроверен'),'score-label badge'));
    const difficulties: Record<string,string> = {relaxed:text('Relaxed','Спокойно'),easy:text('Easy','Лесно'),normal:text('Normal','Нормално'),hard:text('Hard','Трудно'),expert:text('Expert','Експерт')};
    card.append(node('small',entry.difficulty ? difficulties[entry.difficulty] ?? entry.difficulty : text('Unspecified','Неуточнена'),'difficulty-badge'),node('small',new Intl.DateTimeFormat(language(),{dateStyle:'medium'}).format(new Date(entry.achieved_at))));
    el('podium').append(card);
  }
  for (const entry of data.rows) {
    if (entry.rank <= 3) continue;
    const row = document.createElement('tr');
    if (entry.player_id === currentUser) { row.className = 'is-you'; row.setAttribute('aria-label',text('Your result','Твоят резултат')); }
    const player = node('td','','player-cell'); player.append(avatar(entry),node('span',name(entry)));
    const score = node('td',format(entry.score),'score-cell'); score.append(node('small',entry.verification === 'verified' ? text('Verified','Проверен') : text('Unverified','Непроверен')));
    const difficulties: Record<string,string> = {relaxed:text('Relaxed','Спокойно'),easy:text('Easy','Лесно'),normal:text('Normal','Нормално'),hard:text('Hard','Трудно'),expert:text('Expert','Експерт')};
    row.append(node('td',String(entry.rank),'rank'),player,score,node('td',modeName(entry.mode)),node('td',entry.difficulty ? difficulties[entry.difficulty] ?? entry.difficulty : text('Unspecified','Неуточнена')),node('td',new Intl.DateTimeFormat(language(),{dateStyle:'medium'}).format(new Date(entry.achieved_at))));
    el('rankings').append(row);
  }
  el('personal').hidden = !currentUser;
  el('personal').replaceChildren();
  if (currentUser) {
    el('personal').append(node('h2',text('Your expedition record','Твоите постижения')));
    for (const [label,value] of [[text('Current rank','Текущо място'), data.personal ? '#'+data.personal.rank : '—'],[text('Personal best · all modes','Личен рекорд · всички режими'), data.best === null ? '—' : format(data.best)],[text('Best · selected filters','Най-добър · избрани филтри'),data.personal ? format(data.personal.score) : '—'],[text('Completed games','Завършени игри'),format(data.completed_games)]]) {
      const stat = node('div','','personal-stat'); stat.append(node('small',label),node('strong',value)); el('personal').append(stat);
    }
  }
  el('player-count').textContent = `${format(data.total)} ${data.total === 1 ? text('explorer','изследовател') : text('explorers','изследователи')}`;
  const table = document.querySelector<HTMLElement>('.table-scroll')!;
  table.hidden = data.rows.every(entry => entry.rank <= 3);
  document.querySelector('.ranking-empty')?.remove();
  if (table.hidden && data.total > 0) table.after(node('p',text('Every explorer is on the podium so far. Play a game to join them.','Всички изследователи засега са на подиума. Изиграй игра, за да се присъединиш.'),'ranking-empty'));
  document.querySelector<HTMLElement>('.pagination')!.hidden = data.total <= 20;
  el('page-number').textContent = `${Math.floor(offset/20)+1} / ${Math.max(1,Math.ceil(data.total/20))}`;
  el<HTMLButtonElement>('previous').disabled = offset === 0;
  el<HTMLButtonElement>('more').disabled = offset+20 >= data.total;
  el('board-status').textContent = data.total ? '' : text('No eligible scores yet. Your next expedition could be the first.','Все още няма допустими резултати. Следващата ти игра може да е първата.');
}
async function load() {
  const version = ++request;
  controller?.abort();
  controller = new AbortController();
  currentBoard = undefined;
  el('board-status').textContent = text('Loading the leaderboard…','Зареждане на класацията…');
  el('board-retry').hidden = true;
  document.querySelector('.ranking-empty')?.remove();
  el('player-count').textContent = '';
  document.querySelector<HTMLElement>('.pagination')!.hidden = true;
  el('podium').replaceChildren(); el('rankings').replaceChildren(); el('personal').hidden = true;
  el<HTMLButtonElement>('previous').disabled = el<HTMLButtonElement>('more').disabled = true;
  try {
    if (!client) throw new Error('Configuration unavailable');
    const {data,error} = await client.rpc('get_leaderboard',{p_mode:el<HTMLSelectElement>('mode').value || null,p_verified:el<HTMLSelectElement>('verification').value === 'verified',p_offset:offset,p_difficulty:el<HTMLSelectElement>('difficulty').value || null}).abortSignal(controller.signal);
    if(version !== request) return;
    if(error) throw error;
    currentBoard = data as Board;
    render(currentBoard);
  } catch {
    if(version !== request) return;
    el('board-status').textContent = text('Could not load the leaderboard. Please try again.','Класацията не може да се зареди. Опитай отново.'); el('board-retry').hidden = false;
  }
}
initializeShell('leaderboard');
initializeLanguage();
el('difficulty').onchange = el('mode').onchange = el('verification').onchange = () => { offset=0; void load(); };
el('more').onclick = () => { offset+=20; void load(); };
el('previous').onclick = () => { offset=Math.max(0,offset-20); void load(); };
el('board-retry').onclick = () => void load();
window.addEventListener('languagechange', () => {
  if (currentBoard) render(currentBoard);
  else if (el('board-retry').hidden) el('board-status').textContent = text('Loading the leaderboard…','Зареждане на класацията…');
  else el('board-status').textContent = text('Could not load the leaderboard. Please try again.','Класацията не може да се зареди. Опитай отново.');
});
window.addEventListener('pageshow', event => { if(event.persisted) void load(); });
async function initialize() {
  if(client) {
    await client.auth.getSession().then(({data})=>{currentUser=data.session?.user.is_anonymous ? undefined : data.session?.user.id;});
    client.auth.onAuthStateChange((_event,session)=>{const next=session?.user.is_anonymous ? undefined : session?.user.id; if(next!==currentUser) {currentUser=next;void load();}});
  }
  void load();
}
void initialize();
