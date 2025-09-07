import { $ } from 'bun';
import path from 'node:path';
import { styleText } from 'node:util';
import { expandTilde, isDir } from './utils.js';

type ShellState = {
  readonly cwd: string;
  readonly prevCwd: string;
};

const createInitialState = (): ShellState => ({
  cwd: process.cwd(),
  prevCwd: process.cwd(),
});

const formatPrompt = (cwd: string): string => {
  const home = process.env.HOME || process.env.USERPROFILE || '';
  const displayPath =
    home && cwd.startsWith(home) ? '~' + cwd.slice(home.length) : cwd;

  return `${styleText('cyan', displayPath)} ${styleText(
    'white',
    'via'
  )} ${styleText('green', 'λ')} `;
};

const resolveTarget = (arg: string, state: ShellState): string => {
  if (!arg) {
    return process.env.HOME || process.env.USERPROFILE || state.cwd;
  }

  if (arg === '-') {
    return state.prevCwd;
  }

  const expanded = expandTilde(arg);
  return path.isAbsolute(expanded)
    ? expanded
    : path.resolve(state.cwd, expanded);
};

const executeCommand = async (
  cmd: string,
  state: ShellState
): Promise<{ output: string; newState: ShellState }> => {
  if (!cmd) return { output: '', newState: state };
  if (cmd === ':q' || cmd === ':quit' || cmd === ':exit') process.exit(0);

  if (cmd.startsWith('cd')) {
    const [, raw] = cmd.split(/\s+/, 2);
    const arg = raw ?? '';
    const target = resolveTarget(arg, state);

    if (!isDir(target)) {
      return { output: `cd: no such directory: ${arg}`, newState: state };
    }

    const newState: ShellState = {
      cwd: target,
      prevCwd: state.cwd,
    };

    $.cwd(newState.cwd);
    return { output: '', newState };
  }

  if (cmd === 'pwd') {
    return { output: state.cwd, newState: state };
  }

  const output = await $`${{ raw: cmd }}`.cwd(state.cwd).text();
  return { output, newState: state };
};

export class Shell {
  private state: ShellState;

  constructor() {
    this.state = createInitialState();
  }

  getCurrentWorkingDir(): string {
    return this.state.cwd;
  }

  formatPrompt(): string {
    return formatPrompt(this.state.cwd);
  }

  async runCommand(text: string): Promise<string> {
    const cmd = text.trim();
    const { output, newState } = await executeCommand(cmd, this.state);
    this.state = newState;
    return output;
  }
}
