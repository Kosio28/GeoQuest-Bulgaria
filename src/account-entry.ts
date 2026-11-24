import { t } from './i18n.ts';
import type { Mode, Difficulty } from './game.ts';
import type { ScoreSaveResult } from './account.ts';

export const AUTH_STORAGE_KEY = 'geoquest-auth';
export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
export const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

export interface CompletedScore {
  id: string;
  mode: Mode;
  difficulty?: Difficulty | null;
  time_limit_seconds?: number | null;
  scoring_version?: string | null;
  total_points: number;
  duration_ms: number;
  completed_at: string;
}

const configured = Boolean(supabaseUrl && supabaseKey?.startsWith('sb_publishable_'));
let account: ReturnType<typeof loadAccount> | undefined;

function loadAccount() {
  return import('./account.ts').then(module => module.connectAccount()).catch(error => {
    account = undefined;
    throw error;
  });
}

export function initializeAccount() {
  if (!configured) return;
  const button = document.querySelector<HTMLButtonElement>('#open-account')!;
  const dialog = document.querySelector<HTMLDialogElement>('#account-dialog')!;
  const status = document.querySelector('#account-status')!;
  button.hidden = false;
  button.textContent = t('Account');
  window.addEventListener('languagechange', () => { if (!account) button.textContent = t('Account'); });
  button.onclick = async () => {
    if (dialog.open) return;
    dialog.showModal();
    status.textContent = t('Loading your account…');
    try {
      const connection = await (account ??= loadAccount());
      if (dialog.open) connection.open();
    } catch {
      status.textContent = t('Could not load your account. Close this window and try again.');
    }
  };

  const hash = new URLSearchParams(location.hash.slice(1));
  if (hash.has('access_token') || hash.has('error_code') || new URLSearchParams(location.search).has('code')) {
    button.click();
    return;
  }
  try {
    if (localStorage.getItem(AUTH_STORAGE_KEY)) {
      account = loadAccount();
      void account.catch(() => {});
    }
  } catch {
    // The account can still be opened if the browser blocks persistent storage.
  }
}

export async function saveCompletedScore(score: CompletedScore): Promise<ScoreSaveResult> {
  if (!configured) return { status: 'unavailable' };
  if (!account) return { status: 'guest' };
  try {
    return await (await account).save(score);
  } catch {
    return { status: 'failed' };
  }
}
