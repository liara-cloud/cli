#!/usr/bin/env node
/**
 * Liara CLI – Smart Command Suggestion
 * Automatically detects and corrects mistyped commands (e.g. `liara depl` → `deploy`)
 * Works seamlessly with oclif's modern `execute()` method.
 */

import { execute } from '@oclif/core';
import fs from 'fs';
import path from 'path';
import url from 'url';
import chalk from 'chalk';

function levenshtein(a, b) {
  const m = a.length,
    n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }
  return dp[m][n];
}

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const commandsDir = path.resolve(__dirname, '../src/commands');

function getAllCommands(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  const cmds = [];
  for (const f of files) {
    if (f.isDirectory()) cmds.push(f.name);
    else if (f.name.endsWith('.ts') || f.name.endsWith('.js'))
      cmds.push(f.name.replace(/\.(ts|js)$/, ''));
  }
  return cmds;
}

const args = process.argv.slice(2);
const userCmd = args[0];

if (userCmd) {
  const available = getAllCommands(commandsDir);
  if (!available.includes(userCmd)) {
    const scored = available
      .map((cmd) => ({ cmd, dist: levenshtein(userCmd, cmd) }))
      .sort((a, b) => a.dist - b.dist);

    const best = scored[0];
    if (best && best.dist <= 3) {
      console.log(
        chalk.cyanBright.bold(`\n💡 Did you mean `) +
          chalk.greenBright.bold(`"${best.cmd}"`) +
          chalk.cyanBright.bold(`? Running it automatically...\n`),
      );
      process.argv[2] = best.cmd;
    } else {
      console.log(chalk.redBright(`\n✖ Unknown command: "${userCmd}"`));
      console.log(chalk.yellow(`\nHere are the closest matches:`));
      scored
        .slice(0, 5)
        .forEach((s) => console.log(chalk.white(`  • ${s.cmd}`)));
      console.log(
        chalk.gray(`\nTip: run "liara --help" for a full command list.\n`),
      );
      process.exit(1);
    }
  }
}

await execute({ dir: import.meta.url });
