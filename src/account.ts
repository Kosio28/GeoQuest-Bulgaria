import { t, lang } from './i18n.ts';
import { createClient, type User } from '@supabase/supabase-js';
import { AUTH_STORAGE_KEY, supabaseKey, supabaseUrl, type CompletedScore } from './account-entry.ts';

const pageSize = 20;
const pendingPrefix = 'geoquest-pending.';
const points = { format: (value: number) => new Intl.NumberFormat(lang()).format(value) };
const date = { format: (value: Date) => new Intl.DateTimeFormat(lang(), { dateStyle: 'medium', timeStyle: 'short' }).format(value) };

const byId = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

export type ScoreSaveResult =
  | { status: 'saved' | 'guest' | 'unavailable' | 'failed'; personalBest?: boolean }
  | { status: 'pending'; retry: () => Promise<ScoreSaveResult> };

export async function connectAccount() {
  const client = createClient(supabaseUrl!, supabaseKey!, { auth: { storageKey: AUTH_STORAGE_KEY } });
  const dialog = byId<HTMLDialogElement>('account-dialog');
  const status = byId('account-status');
  const form = byId<HTMLFormElement>('account-form');
  const password = byId<HTMLInputElement>('account-password');
  const submit = byId<HTMLButtonElement>('account-submit');
  const switchForm = byId<HTMLButtonElement>('account-switch');
  const signOut = byId<HTMLButtonElement>('sign-out');
  const more = byId<HTMLButtonElement>('history-more');
  const scores = byId('history-scores');
  const historyStatus = byId('history-status');
  const pending = new Map<string, CompletedScore>();
  const saving = new Map<string, Promise<{ personalBest: boolean } | false>>();
  const profile = byId<HTMLFormElement>('public-profile');
  let profileRequest = 0;
  let user: User | undefined;
  let signUp = false;
  let offset = 0;
  let historyRequest = 0;
  let best: number | null | undefined;
  function renderBest() {
    const display = byId('personal-best');
    display.hidden = !user;
    display.textContent = best === undefined ? t('Could not load personal best') : best === null ? t('No completed games yet') : t('Personal best') + ' · ' + points.format(best) + ' / 25 000';
  }
  async function loadBest(owner: string) {
    const { data, error } = await client.from('game_scores').select('total_points').eq('user_id', owner).or('scoring_version.eq.distance-v1,scoring_version.is.null').order('total_points', { ascending: false }).limit(1);
    if (user?.id !== owner) return;
    best = error ? undefined : data?.[0]?.total_points ?? null;
    renderBest();
  }
  let callbackMessage = new URLSearchParams(location.hash.slice(1)).has('error_code')
    ? t('This confirmation link has expired or is invalid. Try signing in or creating your account again.') : '';

  function setSignUp(enabled: boolean) {
    signUp = enabled;
    submit.textContent = enabled ? t('Create account') : t('Sign in');
    switchForm.textContent = enabled ? t('Back to sign in') : t('Create account');
    password.autocomplete = enabled ? 'new-password' : 'current-password';
    password.minLength = enabled ? 8 : 0;
    password.placeholder = enabled ? t('At least 8 characters') : '';
  }

  async function loadHistory(reset = false) {
    if (!user || !dialog.open) return;
    const request = ++historyRequest;
    const owner = user.id;
    if (reset) {
      offset = 0;
      scores.replaceChildren();
    }
    more.hidden = true;
    historyStatus.textContent = t('Loading scores…');
    try {
      const { data, error } = await client.from('game_scores')
        .select('id,mode,total_points,duration_ms,completed_at')
        .eq('user_id', owner).order('completed_at', { ascending: false }).order('id', { ascending: false })
        .range(offset, offset + pageSize);
      if (request !== historyRequest || !dialog.open) return;
      if (error) throw error;
      const page = data.slice(0, pageSize) as CompletedScore[];
      for (const score of page) {
        const row = document.createElement('li');
        const total = document.createElement('strong');
        total.className = 'score-display';
        total.textContent = points.format(score.total_points) + ' ' + t('pts');
        const detail = document.createElement('span');
        const seconds = Math.floor(score.duration_ms / 1000);
        detail.textContent = (score.mode === 'classic' ? t('Classic') : t('No Move')) + ' · ' +
          Math.floor(seconds / 60) + ' ' + t('min') + ' ' + seconds % 60 + ' ' + t('s') + ' · ' + date.format(new Date(score.completed_at));
        row.append(total, detail);
        scores.append(row);
      }
      offset += page.length;
      historyStatus.textContent = offset ? '' : t('Finish a five-round game to see your first score here.');
      more.textContent = t('Load more');
      more.hidden = data.length <= pageSize;
    } catch {
      if (request !== historyRequest || !dialog.open) return;
      historyStatus.textContent = t('Could not load your scores.');
      more.textContent = t('Retry');
      more.hidden = false;
    }
  }

  function renderAccount(load = true) {
    const version = ++profileRequest;
    const owner = user?.id;
    profile.reset();
    byId('profile-status').textContent = '';
    if (owner) void client.from('profiles').select('username').eq('id',owner).maybeSingle().then(({data}) => {
      if (version === profileRequest && user?.id === owner) (profile.elements.namedItem('username') as HTMLInputElement).value = data?.username ?? '';
    });
    historyRequest++;
    scores.replaceChildren();
    byId('open-account').textContent = user ? t('My scores') : t('Account');
    form.hidden = Boolean(user);
    byId('account-history').hidden = !user;
    byId('account-email').textContent = user?.email ?? '';
    if (user && load) void loadHistory(true);
  }

  function writeScore(owner: string, score: CompletedScore): Promise<{ personalBest: boolean } | false> {
    const key = pendingPrefix + owner + '.' + score.id;
    if (user?.id !== owner) return Promise.resolve(false);
    const active = saving.get(key);
    if (active) return active;
    const write = (async () => {
      try {
        const { data, error } = await client.rpc('submit_game_score', {
          p_id: score.id, p_mode: score.mode, p_points: score.total_points, p_duration: score.duration_ms,
          p_difficulty: score.difficulty ?? null,
        });
        if (error) return false;
        pending.delete(key);
        try { localStorage.removeItem(key); } catch { /* Storage may be blocked. */ }
        return { personalBest: data?.personal_best === true };
      } catch {
        return false;
      } finally {
        saving.delete(key);
      }
    })();
    saving.set(key, write);
    return write;
  }

  async function flushScores(owner: string) {
    const prefix = pendingPrefix + owner + '.';
    try {
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith(prefix) && !pending.has(key)) {
          const value = localStorage.getItem(key);
          if (value) pending.set(key, JSON.parse(value) as CompletedScore);
        }
      }
    } catch { /* In-memory scores are still retried. */ }
    let changed = false;
    for (const [key, score] of pending) {
      if (key.startsWith(prefix) && await writeScore(owner, score)) changed = true;
    }
    if (changed && user?.id === owner) { void loadHistory(true); void loadBest(owner); }
  }

  async function save(score: CompletedScore): Promise<ScoreSaveResult> {
    const owner = user?.id;
    if (!owner) return { status: 'guest' };
    const key = pendingPrefix + owner + '.' + score.id;
    pending.set(key, score);
    try { localStorage.setItem(key, JSON.stringify(score)); } catch { /* Keep the pending score in memory. */ }
    const retry = async (): Promise<ScoreSaveResult> => {
      const result = await writeScore(owner, score);
      if (!result) return { status: 'pending', retry };
      if (user?.id === owner) { void loadHistory(true); void loadBest(owner); }
      return { status: 'saved', personalBest: result.personalBest };
    };
    return retry();
  }

  setSignUp(false);

  more.onclick = () => void loadHistory();
  profile.onsubmit = async event => {
    event.preventDefault();
    const owner = user?.id;
    if (!owner) return;
    const button = profile.querySelector('button')!;
    const username = String(new FormData(profile).get('username')).trim();
    if (!/^[A-Za-z0-9А-Яа-я_ -]{3,30}$/.test(username)) {
      byId('profile-status').textContent = lang() === 'en' ? 'Use 3–30 letters, numbers, spaces, hyphens or underscores.' : 'Използвай 3–30 букви, цифри, интервали, тирета или долни черти.'; return;
    }
    button.disabled = true;
    try {
      let {data:updated,error} = await client.from('profiles').update({username}).eq('id',owner).select('id');
      if (!error && !updated?.length) ({error} = await client.from('profiles').insert({id:owner,username}));
      if (user?.id === owner) byId('profile-status').textContent = error ? (lang()==='en' ? 'Could not save username.' : 'Името не може да се запази.') : (lang()==='en' ? 'Public username saved.' : 'Публичното име е запазено.');
    } catch { if(user?.id===owner) byId('profile-status').textContent=lang()==='en' ? 'Could not save username.' : 'Името не може да се запази.'; }
    finally {button.disabled=false;}
  };
  switchForm.onclick = () => {
    setSignUp(!signUp);
    status.textContent = '';
    password.value = '';
    form.querySelector('input')!.focus();
  };
  form.onsubmit = async event => {
    event.preventDefault();
    const values = new FormData(form);
    const credentials = { email: String(values.get('email')).trim(), password: password.value };
    submit.disabled = switchForm.disabled = true;
    status.textContent = signUp ? t('Creating your account…') : t('Signing in…');
    try {
      const redirect = new URL(location.pathname, location.origin).href;
      const { data, error } = signUp
        ? await client.auth.signUp({ ...credentials, options: { emailRedirectTo: redirect } })
        : await client.auth.signInWithPassword(credentials);
      if (error) throw error;
      form.reset();
      setSignUp(false);
      status.textContent = data.session ? '' : t('Check your email for a confirmation link, then sign in.');
    } catch (error) {
      status.textContent = t('Sign-in failed. Check your details or try again later.');
    } finally {
      submit.disabled = switchForm.disabled = false;
    }
  };
  signOut.onclick = async () => {
    signOut.disabled = true;
    try {
      const { error } = await client.auth.signOut({ scope: 'local' });
      if (error) throw error;
      status.textContent = t('Signed out.');
      form.querySelector('input')!.focus();
    } catch {
      status.textContent = t('Could not sign out. Check your connection and try again.');
    } finally {
      signOut.disabled = false;
    }
  };
  dialog.addEventListener('close', () => { password.value = ''; historyRequest++; });
  window.addEventListener('online', () => { if (user) void flushScores(user.id); });

  await new Promise<void>(resolve => {
    client.auth.onAuthStateChange((event, session) => {
      const previous = user?.id;
      user = session?.user.is_anonymous ? undefined : session?.user;
      if (previous !== user?.id) {
        best = undefined; renderBest();
        renderAccount(false);
        const owner = user?.id;
        if (owner) setTimeout(() => {
          if (user?.id !== owner) return;
          if (event !== 'INITIAL_SESSION') void loadHistory(true);
          void flushScores(owner);
          void loadBest(owner);
        }, 0);
      }
      if (event === 'INITIAL_SESSION') resolve();
    });
  });

  window.addEventListener('languagechange', () => { setSignUp(signUp); renderAccount(); renderBest(); });
  return {
    open() {
      status.textContent = callbackMessage;
      callbackMessage = '';
      renderAccount();
      if (!user) form.querySelector('input')!.focus();
    },
    save,
  };
}
