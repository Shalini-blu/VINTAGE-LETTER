import type { DistressSettings } from './distress';

const MY_IDS_KEY = 'letterpress_my_letter_ids';

export function getMyLetterIds(): number[] {
  try { return JSON.parse(localStorage.getItem(MY_IDS_KEY) || '[]'); }
  catch { return []; }
}

export function addMyLetterId(id: number): void {
  const ids = getMyLetterIds();
  if (!ids.includes(id)) localStorage.setItem(MY_IDS_KEY, JSON.stringify([id, ...ids]));
}

export function removeMyLetterId(id: number): void {
  localStorage.setItem(MY_IDS_KEY, JSON.stringify(getMyLetterIds().filter(i => i !== id)));
}

const DISTRESS_KEY = (id: number) => `letterpress_distress_${id}`;

export function getDistressSettings(id: number): DistressSettings | null {
  try { return JSON.parse(localStorage.getItem(DISTRESS_KEY(id)) || 'null'); }
  catch { return null; }
}

export function saveDistressSettings(id: number, s: DistressSettings): void {
  localStorage.setItem(DISTRESS_KEY(id), JSON.stringify(s));
}
