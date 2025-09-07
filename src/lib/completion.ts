import path from 'node:path';
import type { Completer } from 'node:readline';
import { expandTilde, listDirs } from './utils.js';

type CycleState = {
  readonly key: string;
  readonly candidates: readonly string[];
  readonly idx: number;
};

type CdInfo = {
  readonly cdPrefix: string;
  readonly typed: string;
  readonly typedUntilLastSepShown: string;
  readonly sepShown: string;
  readonly baseShown: string;
  readonly namePart: string;
  readonly endsWithSep: boolean;
  readonly siblings: readonly string[];
};

const buildBaseShown = (
  basePart: string,
  sepShown: string,
  line: string
): string => {
  const baseShownInitial = basePart
    .replace(/[\\/]/g, sepShown)
    .replace(/[/\\]$/, '');

  if (!/^\s*cd\s+~/.test(line)) {
    return baseShownInitial;
  }

  const homeAbs = (process.env.HOME || process.env.USERPROFILE || '').replace(
    /[\\/]/g,
    path.sep
  );
  const absBase = expandTilde(basePart).replace(/[\\/]/g, path.sep);

  if (homeAbs && absBase.startsWith(homeAbs)) {
    const rel = '~' + absBase.slice(homeAbs.length);
    return rel.replace(/[\\/]/g, sepShown).replace(/[/\\]$/, '');
  }

  return baseShownInitial;
};

const buildCdInfo = (line: string, cwd: string): CdInfo | null => {
  const m = /^(\s*cd\s+)(.*)$/.exec(line);
  if (!m) return null;

  const cdPrefix = m[1]!;
  const typed = m[2] ?? '';
  const usedBackslash = /\\/.test(typed);
  const sepShown = usedBackslash ? '\\' : '/';

  const unified = typed.replace(/[\\/]/g, path.sep);
  const lastSep = unified.lastIndexOf(path.sep);

  const basePart = lastSep >= 0 ? unified.slice(0, lastSep + 1) : '';
  const namePart = lastSep >= 0 ? unified.slice(lastSep + 1) : unified;
  const endsWithSep = lastSep >= 0 && lastSep === unified.length - 1;

  const baseDirAbs = expandTilde(
    basePart
      ? path.isAbsolute(basePart)
        ? basePart
        : path.resolve(cwd, basePart)
      : cwd
  );

  const siblings = listDirs(baseDirAbs)
    .filter((d) => d.toLowerCase().startsWith(namePart.toLowerCase()))
    .sort((a, b) => a.localeCompare(b));

  const baseShown = buildBaseShown(basePart, sepShown, line);

  const typedUntilLastSepShown =
    lastSep >= 0
      ? typed.slice(0, typed.lastIndexOf(usedBackslash ? '\\' : '/') + 1)
      : '';

  return {
    cdPrefix,
    typed,
    typedUntilLastSepShown,
    sepShown,
    baseShown,
    namePart,
    endsWithSep,
    siblings,
  };
};

const getNextCycleState = (
  key: string,
  siblings: readonly string[],
  currentState: CycleState | null
): { candidates: readonly string[]; idx: number } => {
  if (currentState && currentState.key === key) {
    const candidates = currentState.candidates;
    if (candidates.length === 0) return { candidates: [], idx: 0 };
    const idx = (currentState.idx + 1) % candidates.length;
    return { candidates, idx };
  }

  return { candidates: siblings, idx: 0 };
};

const buildSuggestion = (info: CdInfo, choice: string): string => {
  return (info.baseShown ? info.baseShown + info.sepShown : '') + choice;
};

// Functional state management using closure
export const createCompleter = (
  getCurrentWorkingDir: () => string
): {
  completer: Completer;
  resetState: () => void;
} => {
  const state = { current: null as CycleState | null };

  const completer: Completer = (line) => {
    const info = buildCdInfo(line, getCurrentWorkingDir());
    if (!info) return [[], line];

    const key = `${getCurrentWorkingDir()}|${info.cdPrefix}|${
      info.typedUntilLastSepShown
    }`;
    const { candidates, idx } = getNextCycleState(
      key,
      info.siblings,
      state.current
    );

    if (candidates.length === 0) return [[], line];

    const choice = candidates[idx]!;
    const suggestion = buildSuggestion(info, choice);
    const partToReplace = line.slice(info.cdPrefix.length);

    state.current = { key, candidates, idx };

    return [[suggestion], partToReplace];
  };

  const resetState = (): void => {
    state.current = null;
  };

  return { completer, resetState };
};
