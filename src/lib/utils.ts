import fs from 'node:fs';
import path from 'node:path';

export const expandTilde = (p: string): string =>
  p.startsWith('~')
    ? path.join(process.env.HOME || process.env.USERPROFILE || '', p.slice(1))
    : p;

export const isDir = (p: string): boolean => {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
};

export const listDirs = (base: string): string[] => {
  try {
    return fs
      .readdirSync(base, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
  } catch {
    return [];
  }
};
