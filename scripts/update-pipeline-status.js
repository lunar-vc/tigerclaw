#!/usr/bin/env node
//
// update-pipeline-status — Updates a pipeline entry's action/status.
//
// Used during session startup to sync Linear issue statuses back to the
// local pipeline. Claude checks each Linear issue's status and calls this
// script to update .pipeline-index.json and MEMORY.md accordingly.
//
// Usage:
//   node scripts/update-pipeline-status.js <slug> <new-action>
//   node scripts/update-pipeline-status.js jane-doe IN_PROGRESS
//   node scripts/update-pipeline-status.js jane-doe DONE
//
// Valid actions: REACH_OUT, WATCH, IN_PROGRESS, DONE, PASS

import { readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');

const projectSlug = PROJECT_ROOT.replace(/\//g, '-');
const MEMORY_DIR = join(process.env.HOME, '.claude/projects', projectSlug, 'memory');

const PIPELINE_INDEX = join(PROJECT_ROOT, '.pipeline-index.json');
const MEMORY_INDEX = join(MEMORY_DIR, 'MEMORY.md');

const VALID_ACTIONS = ['REACH_OUT', 'WATCH', 'IN_PROGRESS', 'DONE', 'PASS'];

async function main() {
  const slug = process.argv[2];
  const newAction = process.argv[3];

  if (!slug || !newAction) {
    console.error('Usage: update-pipeline-status.js <slug> <new-action>');
    process.exit(1);
  }

  if (!VALID_ACTIONS.includes(newAction)) {
    console.error(`Invalid action: ${newAction}. Must be one of: ${VALID_ACTIONS.join(', ')}`);
    process.exit(1);
  }

  // 1. Update .pipeline-index.json
  let index;
  try {
    index = JSON.parse(await readFile(PIPELINE_INDEX, 'utf8'));
  } catch {
    console.error('Could not read .pipeline-index.json');
    process.exit(1);
  }

  let found = false;
  let entityType = null;
  let name = null;

  if (index.people && index.people[slug]) {
    const oldAction = index.people[slug].action;
    index.people[slug].action = newAction;
    index.people[slug].last_seen = today();
    name = index.people[slug].name;
    entityType = 'person';
    found = true;
  } else if (index.companies && index.companies[slug]) {
    const oldAction = index.companies[slug].action;
    index.companies[slug].action = newAction;
    index.companies[slug].last_seen = today();
    name = index.companies[slug].name;
    entityType = 'company';
    found = true;
  }

  if (!found) {
    console.error(JSON.stringify({ ok: false, error: `Slug "${slug}" not found in pipeline index` }));
    process.exit(1);
  }

  index.updated_at = today();
  await writeFile(PIPELINE_INDEX, JSON.stringify(index, null, 2) + '\n');

  // 2. Update MEMORY.md index table row
  try {
    let content = await readFile(MEMORY_INDEX, 'utf8');
    const subdir = entityType === 'person' ? 'people' : 'companies';
    const fileRef = `${subdir}/${slug}.md`;

    // Match the row containing this slug's file reference and update the action column
    const rowPattern = new RegExp(`^(\\|[^|]+\\|)\\s*[^|]+\\s*(\\|[^|]+\\| ${fileRef.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\|)$`, 'm');
    const match = content.match(rowPattern);
    if (match) {
      content = content.replace(rowPattern, `$1 ${newAction} $2`);
      await writeFile(MEMORY_INDEX, content);
    }
  } catch {
    // MEMORY.md update is best-effort; pipeline index is the source of truth
  }

  // 3. Update topic file header
  try {
    const subdir = entityType === 'person' ? 'people' : 'companies';
    const topicPath = join(MEMORY_DIR, subdir, `${slug}.md`);
    let topicContent = await readFile(topicPath, 'utf8');

    // Update the title line (# Name — ACTION)
    topicContent = topicContent.replace(
      /^(# .+?) — \w+$/m,
      `$1 — ${newAction}`
    );

    // Update the Action field
    topicContent = topicContent.replace(
      /^- \*\*Action:\*\* \w+$/m,
      `- **Action:** ${newAction}`
    );

    await writeFile(topicPath, topicContent);
  } catch {
    // Topic file update is best-effort
  }

  console.log(JSON.stringify({
    ok: true,
    slug,
    name,
    entity: entityType,
    action: newAction,
    message: `Updated ${entityType} "${name}" to ${newAction}`
  }));
}

function today() {
  return new Date().toISOString().split('T')[0];
}

main().catch(err => {
  console.error(JSON.stringify({ ok: false, error: err.message }));
  process.exit(1);
});
