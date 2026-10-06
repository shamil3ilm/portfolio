#!/usr/bin/env node
// Builds resume.html and the 60-second view in index.html from profile.json, and one
// tailored résumé page resume/<slug>.html per variants/<slug>.json.
//
//   node scripts/build-resume.mjs           validate every profile file, then write the pages
//   node scripts/build-resume.mjs --check   validate, and fail if a generated page is stale, missing or orphaned
//
// Zero dependencies. Every check runs before anything is written, so an invalid profile
// or variant never touches the pages and exits non-zero (which fails the Vercel build,
// leaving the previous deployment live).

import { existsSync, mkdirSync, readdirSync, readFileSync, rmdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkProfile } from './lib/profile.mjs';
import { fillTemplate, quickViewValues, resumeValues, variantPage } from './lib/render.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPTS = join(ROOT, 'scripts');

const PATHS = Object.freeze({
  profile: join(ROOT, 'profile.json'),
  schema: join(SCRIPTS, 'profile.schema.json'),
  resumeTemplate: join(SCRIPTS, 'resume.template.html'),
  quickViewTemplate: join(SCRIPTS, 'quick-view.template.html'),
  resume: join(ROOT, 'resume.html'),
  index: join(ROOT, 'index.html'),
  variants: join(ROOT, 'variants'),
  variantPages: join(ROOT, 'resume'),
});

const QUICK_START = /^ {2}<!-- profile:quick-view:start[^\n]*-->\n/m;
const QUICK_END = /^ {2}<!-- profile:quick-view:end -->\n/m;

/** variants/<slug>.json, with the same slug rule lee uses. */
const VARIANT_FILE = /^([a-z0-9][a-z0-9-]{0,59})\.json$/;
/** Every page this script writes carries this comment; anything else in resume/ is hand-written. */
const GENERATED_MARKER = /^<!-- Generated from \S+ by scripts\/build-resume\.mjs\./m;

class BuildError extends Error {}

const toLf = (text) => text.replace(/\r\n/g, '\n');
const rel = (path) => path.slice(ROOT.length + 1).replace(/\\/g, '/');

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
    throw new BuildError(`${rel(path)} is not valid JSON: ${err.message}`);
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

function listDir(path) {
  return existsSync(path) ? readdirSync(path, { withFileTypes: true }) : [];
}

/** meta.canonical of variants/<slug>.json must be https://<site>/variants/<slug>.json. */
function canonicalError(profile, slug) {
  const expected = `/variants/${slug}.json`;
  if (new URL(profile.meta.canonical).pathname === expected) return null;
  return `/meta/canonical: "${profile.meta.canonical}" must end in ${expected} (the file's own address)`;
}

function checkVariant(entry, schema) {
  const name = `variants/${entry.name}`;
  const match = entry.isFile() ? entry.name.match(VARIANT_FILE) : null;
  if (!match) {
    return { problem: `${name}: only <slug>.json files belong here (slug: lowercase letters, digits and "-", up to 60 characters)` };
  }
  const slug = match[1];
  let profile;
  try {
    profile = readJson(join(PATHS.variants, entry.name));
  } catch (err) {
    return { problem: err.message };
  }
  const errors = checkProfile(profile, schema);
  if (!errors.length) {
    const canonical = canonicalError(profile, slug);
    if (canonical) errors.push(canonical);
  }
  if (errors.length) return { problem: `${name} is invalid:\n    - ${errors.join('\n    - ')}` };
  return { variant: { slug, profile } };
}

/** Validates every variants/*.json (none when the folder is missing). Throws listing every problem. */
function loadVariants(schema) {
  const results = listDir(PATHS.variants).map((entry) => checkVariant(entry, schema));
  const problems = results.filter((r) => r.problem).map((r) => r.problem);
  if (problems.length) throw new BuildError(`${problems.length} variant problem(s):\n  - ${problems.join('\n  - ')}`);
  return results.map((r) => r.variant);
}

/**
 * Generated pages in resume/ whose variant is gone (unpublished in lee) are orphans, to be
 * deleted. A file this script did not generate is never touched: it fails the build instead.
 */
function findOrphans(variantOutputs) {
  const wanted = new Set(variantOutputs.map((o) => o.path));
  const orphans = [];
  const foreign = [];
  for (const entry of listDir(PATHS.variantPages)) {
    const path = join(PATHS.variantPages, entry.name);
    const generated = entry.isFile() && GENERATED_MARKER.test(readText(path));
    if (!generated) foreign.push(rel(path));
    else if (!wanted.has(path)) orphans.push(path);
  }
  if (foreign.length) {
    throw new BuildError(`resume/ holds only generated variant pages; move these file(s) elsewhere: ${foreign.join(', ')}`);
  }
  return orphans;
}

function renderResume(template, profile, page, name) {
  const html = fillTemplate(template, resumeValues(profile, page), 'resume.template.html');
  assertFilled(html, name);
  return html;
}

/** Validates and renders. Returns { outputs: [{ path, content }], orphans, variants }; writes nothing. */
function build() {
  const schema = readJson(PATHS.schema);
  const profile = readJson(PATHS.profile);
  const errors = checkProfile(profile, schema);
  if (errors.length) {
    throw new BuildError(`profile.json is invalid (${errors.length} problem(s)):\n  - ${errors.join('\n  - ')}`);
  }
  const variants = loadVariants(schema);

  const template = readText(PATHS.resumeTemplate);
  const resume = renderResume(template, profile, undefined, 'resume.html');
  const quickView = fillTemplate(readText(PATHS.quickViewTemplate), quickViewValues(profile), 'quick-view.template.html');
  assertFilled(quickView, 'quick view');
  const index = spliceQuickView(readText(PATHS.index), quickView);

  const variantOutputs = variants.map(({ slug, profile: doc }) => ({
    path: join(PATHS.variantPages, `${slug}.html`),
    content: renderResume(template, doc, variantPage(doc, slug), `resume/${slug}.html`),
  }));
  return {
    outputs: [{ path: PATHS.resume, content: resume }, { path: PATHS.index, content: index }, ...variantOutputs],
    orphans: findOrphans(variantOutputs),
    variants: variants.length,
  };
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
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, crlf ? content.replace(/\n/g, '\r\n') : content);
  return true;
}

function removeOrphans(orphans) {
  for (const path of orphans) unlinkSync(path);
  if (orphans.length && listDir(PATHS.variantPages).length === 0) rmdirSync(PATHS.variantPages);
}

function main(argv) {
  const check = argv.includes('--check');
  const { outputs, orphans, variants } = build();
  const what = variants ? `profile.json and ${variants} variant(s) are` : 'profile.json is';

  if (check) {
    const stale = outputs
      .filter(({ path, content }) => !existsSync(path) || readText(path) !== content)
      .map(({ path }) => rel(path));
    const problems = [
      ...(stale.length ? [`Stale or missing generated file(s): ${stale.join(', ')}`] : []),
      ...(orphans.length ? [`Generated page(s) with no variant: ${orphans.map(rel).join(', ')}`] : []),
    ];
    if (problems.length) throw new BuildError(`${problems.join('. ')}. Run: node scripts/build-resume.mjs`);
    console.log(`${what} valid and the generated pages are up to date.`);
    return;
  }

  const written = outputs.filter(writeIfChanged).map(({ path }) => rel(path));
  removeOrphans(orphans);
  const changes = [
    ...(written.length ? [`Wrote ${written.join(', ')}.`] : []),
    ...(orphans.length ? [`Removed ${orphans.map(rel).join(', ')}.`] : []),
  ];
  console.log(`${what} valid. ${changes.length ? changes.join(' ') : 'Pages already up to date.'}`);
}

try {
  main(process.argv.slice(2));
} catch (err) {
  console.error(err instanceof BuildError ? `build-resume: ${err.message}` : err);
  process.exitCode = 1;
}
