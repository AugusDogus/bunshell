#!/usr/bin/env bun
import { stdin as input, stdout as output } from 'node:process';
import { createInterface } from 'node:readline';
import { createCompleter } from './lib/completion.js';
import { Shell } from './lib/shell.js';

const shell = new Shell();
const { completer, resetState } = createCompleter(() =>
  shell.getCurrentWorkingDir()
);

const rl = createInterface({ input, output, completer });
rl.setPrompt(shell.formatPrompt());
rl.prompt();

rl.on('line', async (line) => {
  resetState();
  try {
    const out = await shell.runCommand(line);
    if (out) output.write(out.endsWith('\n') ? out : out + '\n');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    output.write(message + '\n');
  } finally {
    rl.setPrompt(shell.formatPrompt());
    rl.prompt();
  }
});

rl.on('close', () => process.exit(0));
