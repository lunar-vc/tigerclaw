#!/usr/bin/env node
//
// update-changelog.js — Prepends a commit entry to CHANGELOG.md under today's date.
//
// Called by the post-commit hook. Reads the commit message from argv or HEAD,
// inserts it under the current date section (creating one if needed).
//
// Usage:
//   node scripts/update-changelog.js "Add foo feature"
//   node scripts/update-changelog.js          # reads from git HEAD

import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CHANGELOG = join(__dirname, '..', 'CHANGELOG.md');

function today() {
  return new Date().toISOString().split('T')[0];
}

function getCommitMessage() {
  const arg = process.argv[2];
  if (arg) return arg.trim();
  return execSync('git log -1 --pretty=%s', { encoding: 'utf8' }).trim();
}

function main() {
  const msg = getCommitMessage();
  if (!msg) process.exit(0);

  // Skip merge commits
  if (msg.startsWith('Merge ')) process.exit(0);

  const date = today();
  const entry = `- ${msg}`;

  let content;
  try {
    content = readFileSync(CHANGELOG, 'utf8');
  } catch {
    // No changelog yet — create from scratch
    content = '# Changelog\n';
  }

  const lines = content.split('\n');
  const dateHeader = `## ${date}`;

  // Find where today's section is (or where to insert a new one)
  let insertAt = -1;
  let todayExists = false;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i] === dateHeader) {
      todayExists = true;
      insertAt = i + 1;
      break;
    }
    // Found a different date section — insert new section before it
    if (lines[i].startsWith('## ') && !todayExists) {
      insertAt = i;
      break;
    }
  }

  if (todayExists) {
    // Insert after the date header (skip any blank line right after header)
    if (insertAt < lines.length && lines[insertAt].trim() === '') {
      insertAt++;
    }
    // Check for duplicate (same message already there)
    if (lines[insertAt] === entry) process.exit(0);
    lines.splice(insertAt, 0, entry);
  } else if (insertAt >= 0) {
    // Insert new date section before the first existing section
    lines.splice(insertAt, 0, dateHeader, entry, '');
  } else {
    // No sections at all — append after header
    lines.push('', dateHeader, entry, '');
  }

  writeFileSync(CHANGELOG, lines.join('\n'));
}

main();
