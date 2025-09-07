#!/usr/bin/env bun
import { $ } from 'bun';

const platforms = [
  { target: 'bun-windows-x64', ext: '.exe', name: 'windows' },
  { target: 'bun-darwin-x64', ext: '', name: 'macos' },
  { target: 'bun-linux-x64', ext: '', name: 'linux' },
] as const;

console.log('Building bunshell for all platforms...\n');

for (const platform of platforms) {
  const distDir = `dist/${platform.name}`;
  const outfile = `${distDir}/bunshell${platform.ext}`;

  // Ensure platform-specific directory exists
  await $`mkdir -p ${distDir}`;

  console.log(`Building for ${platform.name} (${platform.target})...`);

  try {
    await $`bun build src/index.ts --compile --target ${platform.target} --outfile ${outfile}`;
    console.log(`✅ Built: ${outfile}`);
  } catch (error) {
    console.error(`❌ Failed to build for ${platform.name}:`, error);
  }
}

console.log('\n🎉 Build complete!');
