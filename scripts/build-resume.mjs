#!/usr/bin/env node
// Builds resume.html and the 60-second view in index.html from profile.json.
//
//   node scripts/build-resume.mjs           validate profile.json, then write the pages
//   node scripts/build-resume.mjs --check   validate, and fail if the committed pages are stale
//
// Zero dependencies. Every check runs before anything is written, so an invalid
// profile.json never touches the pages and exits non-zero (which fails the Vercel build,
// leaving the previous deployment live).

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkProfile } from './lib/profile.mjs';
import { fillTemplate, quickViewValues, resumeValues } from './lib/render.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPTS = join(ROOT, 'scripts');

const PATHS = Object.freeze({
  profile: join(ROOT, 'profile.json'),
  schema: join(SCRIPTS, 'profile.schema.json'),
  resumeTemplate: join(SCRIPTS, 'resume.template.html'),
  quickViewTemplate: join(SCRIPTS, 'quick-view.template.html'),
  resume: join(ROOT, 'resume.html'),
  index: join(ROOT, 'index.html'),
});

const QUICK_START = /^ {2}<!-- profile:quick-view:start[^\n]*-->\n/m;
const QUICK_END = /^ {2}<!-- profile:quick-view:end -->\n/m;

class BuildError extends Error {}

const toLf = (text) => text.replace(/\r\n/g, '\n');

function readText(path) {
  try {
    return toLf(readFileSync(path, 'utf8'));
  } catch (err) {
    throw new BuildError(`Cannot read ${path}: ${err.message}`);
  }
}

function readJson(path) {
  const text = readText(path);
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new BuildError(`${path} is not valid JSON: ${err.message}`);
  }
}

function assertFilled(html, name) {
  const leftover = html.match(/\{\{\{?\w+\}?\}\}/);
  if (leftover) throw new BuildError(`${name}: placeholder ${leftover[0]} was not filled`);
}

function spliceQuickView(indexHtml, block) {
  const start = indexHtml.match(QUICK_START);
  const end = indexHtml.match(QUICK_END);
  if (!start || !end || end.index < start.index) {
    throw new BuildError('index.html: profile:quick-view start/end markers are missing or out of order');
  }
  if (indexHtml.match(new RegExp(QUICK_START.source, 'gm')).length !== 1) {
    throw new BuildError('index.html: profile:quick-view start marker appears more than once');
  }
  const bodyStart = start.index + start[0].length;
  return indexHtml.slice(0, bodyStart) + block + indexHtml.slice(end.index);
}

/** Validates and renders. Returns [{ path, content }] in LF line endings; writes nothing. */
function build() {
  const profile = readJson(PATHS.profile);
  const errors = checkProfile(profile, readJson(PATHS.schema));
  if (errors.length) {
    throw new BuildError(`profile.json is invalid (${errors.length} problem(s)):\n  - ${errors.join('\n  - ')}`);
  }

  const resume = fillTemplate(readText(PATHS.resumeTemplate), resumeValues(profile), 'resume.template.html');
  const quickView = fillTemplate(readText(PATHS.quickViewTemplate), quickViewValues(profile), 'quick-view.template.html');
  assertFilled(resume, 'resume.html');
  assertFilled(quickView, 'quick view');
  const index = spliceQuickView(readText(PATHS.index), quickView);

  return [
    { path: PATHS.resume, content: resume },
    { path: PATHS.index, content: index },
  ];
}

/** Keeps the file's existing line endings (Windows checkouts use CRLF, Vercel uses LF). */
function writeIfChanged({ path, content }) {
  let current = null;
  try {
    current = readFileSync(path, 'utf8');
  } catch {
    // new file
  }
  if (current !== null && toLf(current) === content) return false;
  const crlf = current !== null && current.includes('\r\n');
  writeFileSync(path, crlf ? content.replace(/\n/g, '\r\n') : content);
  return true;
}

function main(argv) {
  const check = argv.includes('--check');
  const outputs = build();
  const rel = (p) => p.slice(ROOT.length + 1);

  if (check) {
    const stale = outputs.filter(({ path, content }) => readText(path) !== content).map(({ path }) => rel(path));
    if (stale.length) {
      throw new BuildError(`Stale generated file(s): ${stale.join(', ')}. Run: node scripts/build-resume.mjs`);
    }
    console.log('profile.json is valid and the generated pages are up to date.');
    return;
  }

  const written = outputs.filter(writeIfChanged).map(({ path }) => rel(path));
  console.log(`profile.json is valid. ${written.length ? `Wrote ${written.join(', ')}.` : 'Pages already up to date.'}`);
}

try {
  main(process.argv.slice(2));
} catch (err) {
  console.error(err instanceof BuildError ? `build-resume: ${err.message}` : err);
  process.exitCode = 1;
}
