#!/usr/bin/env node
import { execute } from '@oclif/core';
import inquirer from 'inquirer';
import { distance } from 'fastest-levenshtein';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * بازگشت تمام فایل‌های دستورات از src/commands
 */
function getAllCommands(dirPath, base = '') {
  let results = [];
  const files = fs.readdirSync(dirPath);

  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      results = results.concat(getAllCommands(fullPath, path.join(base, file)));
    } else if (file.endsWith('.js') || file.endsWith('.ts')) {
      const name = path.join(base, file.replace(/\.(js|ts)$/, ''));
      results.push(name.replace(/\\/g, '/')); // ویندوز فیکس
    }
  }

  return results;
}

// مسیر commands را مشخص می‌کنیم
const commandsDir = path.join(__dirname, '../src/commands');
const allCommands = getAllCommands(commandsDir);

try {
  await execute({ dir: import.meta.url });
} catch (error) {
  const msg = error.message || '';
  const match = msg.match(/command (\w+) not found/);

  if (match) {
    const wrongCommand = match[1];
    console.log(`\n✖ Unknown command: "${wrongCommand}"\n`);

    // پیشنهاد نزدیک‌ترین دستورها
    const suggestions = allCommands
      .map((cmd) => ({
        cmd,
        dist: distance(cmd.split('/').pop(), wrongCommand),
      }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 5)
      .map((item) => item.cmd);

    if (suggestions.length) {
      console.log('Here are the closest matches:\n');
      suggestions.forEach((s) => console.log(`  • ${s}`));

      const { choice } = await inquirer.prompt([
        {
          type: 'list',
          name: 'choice',
          message: '\nDid you mean one of these?',
          choices: [...suggestions, 'Cancel'],
        },
      ]);

      if (choice !== 'Cancel') {
        console.log(`\n⚡ Running "${choice}" for you...\n`);
        process.argv[2] = choice;
        await execute({ dir: import.meta.url });
      } else {
        console.log('\nOperation cancelled.\n');
      }
    } else {
      console.log('\nTip: run "liara --help" for a full command list.\n');
    }
  } else {
    throw error;
  }
}
