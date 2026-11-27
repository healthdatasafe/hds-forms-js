import type { DocumentConversation } from 'hds-lib';

/**
 * One of her other names, as an `other-name` event holds it (data-model 4.47.0, `contact/other-name-v1`, PROFILE.md §
 * Other names): a missing part is her profile's. A local type, so the forms build on any hds-lib.
 */
export interface OtherName {
  given?: string | null;
  family?: string | null;
  /** `official`, `usual`, `maiden`, `old`, `nickname` (a nickname never matches, R3) */
  use?: string | null;
}

/** Her names, as the host reads them: her profile (`HDSProfile`: `name` given, `surname` family) and her other names */
export interface NamesForMatch {
  profile?: { name?: string | null; surname?: string | null } | null;
  otherNames?: readonly OtherName[] | null;
}

/** A name she saves as one of her other names (the host writes `contact/other-name-v1` on `other-names`) */
export interface RememberedName {
  given?: string;
  family?: string;
}

/**
 * "Remember this name" (CONVERSATION.md R3, 4.47.0): off unless the host passes it. Only once hds-webapp may write
 * other names (PROFILE.md § Other names, "Before the first write" (c), after the production sweep).
 */
export interface RememberNameOptions extends NamesForMatch {
  /** Writes the name she accepted (or changed) as an other name; nothing of it reaches the contact */
  onRemember: (name: RememberedName) => Promise<void> | void;
}

/** The match's normalisation (hds-lib `profileMatch`): case, accents, hyphens, commas, spaces and order aside */
export function nameTokens (s: string): string[] {
  return s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().split(/[\s,-]+/).filter((t) => t.length > 0).sort();
}

/** Each of her names as one string, given then family: her profile's, then each other name with its missing part filled */
export function namesOf ({ profile, otherNames }: NamesForMatch): string[] {
  const given = profile?.name?.trim() ?? '';
  const family = profile?.surname?.trim() ?? '';
  const out: string[] = [];
  if (given !== '' || family !== '') out.push(`${given} ${family}`);
  for (const o of otherNames ?? []) {
    if (o == null) continue;
    const g = typeof o.given === 'string' && o.given.trim() !== '' ? o.given : given;
    const f = typeof o.family === 'string' && o.family.trim() !== '' ? o.family : family;
    out.push(`${g} ${f}`);
  }
  return out;
}

/** Whether a printed name is already one of hers (any of them, a nickname too: nothing new to remember) */
export function isKnownName (printed: string, names: NamesForMatch): boolean {
  const p = nameTokens(printed);
  if (p.length === 0) return false;
  return namesOf(names).some((n) => {
    const t = nameTokens(n);
    return t.length === p.length && t.every((x, i) => x === p[i]);
  });
}

/**
 * A first guess of the parts of a printed name, for her to change: before a comma is the family name ("DUPONT,
 * MARIE"); else the words in capitals are ("DUPONT Marie", "Marie DUPONT"); else the last word is
 */
export function splitPrintedName (printed: string): RememberedName {
  const comma = printed.indexOf(',');
  if (comma > 0) {
    const family = printed.slice(0, comma).trim();
    const given = printed.slice(comma + 1).replace(/,/g, ' ').trim().replace(/\s+/g, ' ');
    if (family !== '' && given !== '') return { given, family };
  }
  const words = printed.replace(/,/g, ' ').trim().split(/\s+/).filter((w) => w !== '');
  if (words.length === 0) return {};
  if (words.length === 1) return { family: words[0] };
  const upper = (w: string): boolean => /\p{L}/u.test(w) && w === w.toLocaleUpperCase() && w !== w.toLocaleLowerCase();
  const fam = words.filter(upper);
  if (fam.length > 0 && fam.length < words.length) return { given: words.filter((w) => !upper(w)).join(' '), family: fam.join(' ') };
  return { given: words.slice(0, -1).join(' '), family: words[words.length - 1] };
}

/**
 * The printed name she may save (R3 "Remember this name"): her latest `is-this-yours` answer is her own `confirm` (a
 * tap, no `basis`), its question printed a name, and that name is none of hers. Null otherwise.
 */
export function nameToRemember (conv: DocumentConversation, names: NamesForMatch): { questionId: string; printed: string } | null {
  if (conv.identity !== 'confirmed') return null;
  for (const q of conv.questions) {
    if (q.code !== 'is-this-yours' || q.state !== 'answered') continue;
    const r = rememberable(q.item.content, q.answer?.content, names);
    if (r != null) return { questionId: q.item.id, printed: r };
  }
  return null;
}

/** The printed name of one `is-this-yours` she confirmed herself, when none of hers; else null */
export function rememberable (question: any, answer: any, names: NamesForMatch): string | null {
  if (answer?.action !== 'confirm' || answer.basis != null) return null;
  const printed = question?.context?.identity?.name;
  if (typeof printed !== 'string' || printed.trim() === '') return null;
  return isKnownName(printed, names) ? null : printed.trim();
}
