// Run: node --test "scripts/test/*.test.mjs"
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { checkProfile, ordered } from '../lib/profile.mjs';
import { escapeHtml, formatDate, formatRange, displayHost, fillTemplate, quickViewValues, resumeValues } from '../lib/render.mjs';
import { validate } from '../lib/validate.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const readJson = (p) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));
const schema = readJson('scripts/profile.schema.json');
const fresh = () => readJson('profile.json');

function mutated(fn) {
  const profile = fresh();
  fn(profile);
  return checkProfile(profile, schema);
}

test('the committed profile.json is valid', () => {
  assert.deepEqual(checkProfile(fresh(), schema), []);
});

test('schema rejects bad edits', () => {
  const cases = [
    [(p) => delete p.basics.name, /missing required property "name"/],
    [(p) => (p.basics.email = 'not-an-email'), /basics\/email/],
    [(p) => (p.basics.url = 'javascript:alert(1)'), /basics\/url/],
    [(p) => (p.basics.profiles[0].url = 'http://insecure.example'), /profiles\/0\/url/],
    [(p) => (p.work[0].startDate = 'Dec 2025'), /work\/0\/startDate/],
    [(p) => (p.work[0].highlights = []), /work\/0\/highlights: must have at least 1/],
    [(p) => (p.work[0].highlights[0] = 42), /expected string/],
    [(p) => (p.skills[0].keywords = ['PHP', 'PHP']), /duplicate item/],
    [(p) => (p.meta['x-portfolio'].typo = true), /x-portfolio\/typo: unknown property/],
    [(p) => (p.meta['x-portfolio'].quickView.results[0].link.href = 'javascript:alert(1)'), /link\/href/],
    [(p) => (p.meta['x-portfolio'].quickView.results[0].link.href = '//evil.example'), /link\/href/],
    [(p) => (p.basics.label = 'line\nbreak'), /basics\/label/],
  ];
  for (const [fn, pattern] of cases) {
    const errors = mutated(fn);
    assert.ok(errors.some((e) => pattern.test(e)), `expected ${pattern} in ${JSON.stringify(errors)}`);
  }
});

test('cross-reference checks', () => {
  assert.match(mutated((p) => p.meta['x-portfolio'].order.work.push('Nobody Inc')).join('\n'), /matches no item in work/);
  assert.match(mutated((p) => (p.meta['x-portfolio'].caseStudies[0].highlight = 99)).join('\n'), /out of range/);
  assert.match(mutated((p) => (p.meta['x-portfolio'].caseStudies[0].work = 'Nobody Inc')).join('\n'), /matches no work item/);
  assert.match(mutated((p) => (p.work[1].endDate = '2024-01')).join('\n'), /is before startDate/);
  assert.match(mutated((p) => (p.work[1].name = p.work[0].name)).join('\n'), /used twice/);
  assert.match(mutated((p) => p.basics.profiles.splice(1, 1)).join('\n'), /"GitHub" profile is required/);
});

test('display order: listed keys first, then the rest in file order', () => {
  const profile = fresh();
  profile.meta['x-portfolio'].order.projects = ['Time', 'Masaar'];
  assert.deepEqual(ordered(profile, 'projects').map((p) => p.name), ['Time', 'Masaar', 'Cert-Ed Academia', 'Athar']);
  delete profile.meta['x-portfolio'].order.skills;
  assert.equal(ordered(profile, 'skills')[0].name, 'Languages');
});

test('formatting helpers', () => {
  assert.equal(formatDate('2025-12'), 'Dec 2025');
  assert.equal(formatDate('2025-01-15'), 'Jan 2025');
  assert.equal(formatDate('2021'), '2021');
  assert.equal(formatRange('2025-12'), 'Dec 2025 – Present');
  assert.equal(formatRange('2021', '2025'), '2021 – 2025');
  assert.equal(displayHost('https://mohamed3shamil.vercel.app/'), 'mohamed3shamil.vercel.app');
  assert.equal(escapeHtml('<a href="x">&</a>'), '&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;');
});

test('fillTemplate escapes text, rejects unknown and unused keys', () => {
  assert.equal(fillTemplate('<p>{{a}}</p>{{{b}}}', { text: { a: '<x>' }, blocks: { b: '<i>' } }, 't'), '<p>&lt;x&gt;</p><i>');
  assert.throws(() => fillTemplate('{{nope}}', { text: {}, blocks: {} }, 't'), /unknown placeholder/);
  assert.throws(() => fillTemplate('', { text: { a: '1' }, blocks: {} }, 't'), /never uses a/);
});

test('validator refuses schema keywords it does not implement', () => {
  assert.throws(() => validate('x', { oneOf: [] }), /not supported/);
});

test('rendering the committed profile reproduces the committed pages', () => {
  const read = (p) => readFileSync(join(ROOT, p), 'utf8').replace(/\r\n/g, '\n');
  const resume = fillTemplate(read('scripts/resume.template.html'), resumeValues(fresh()), 'resume');
  assert.equal(resume, read('resume.html'));
  const quick = fillTemplate(read('scripts/quick-view.template.html'), quickViewValues(fresh()), 'quick');
  assert.ok(read('index.html').includes(quick));
});

test('optional fields render sensibly', () => {
  const profile = fresh();
  delete profile.work[0].location;
  delete profile.projects[0].description;
  delete profile.education[0].endDate;
  delete profile.meta['x-portfolio'].quickView.results[0].link;
  assert.deepEqual(checkProfile(profile, schema), []);
  const r = resumeValues(profile).blocks;
  assert.ok(r.work.includes('<p class="resume-org">Zil Money</p>'));
  assert.ok(r.projects.includes('<strong>Cert-Ed Academia</strong>'));
  assert.ok(r.education.includes('2021 – Present'));
  assert.ok(quickViewValues(profile).blocks.results.includes(
    '<li><strong>Delegated access for service providers.</strong> 450 existing API endpoints opened to providers, every call logged, every refusal identical.</li>',
  ));
});

function sandbox() {
  const dir = mkdtempSync(join(tmpdir(), 'profile-build-'));
  for (const item of ['profile.json', 'resume.html', 'index.html', 'scripts']) {
    cpSync(join(ROOT, item), join(dir, item), { recursive: true });
  }
  const run = (...args) => spawnSync(process.execPath, [join(dir, 'scripts', 'build-resume.mjs'), ...args], { encoding: 'utf8' });
  return { dir, run, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

test('CLI: --check passes on the committed pages', () => {
  const box = sandbox();
  try {
    const result = box.run('--check');
    assert.equal(result.status, 0, result.stderr);
  } finally {
    box.cleanup();
  }
});

test('CLI: an invalid profile fails and leaves the pages untouched', () => {
  const box = sandbox();
  try {
    const before = readFileSync(join(box.dir, 'resume.html'), 'utf8');
    writeFileSync(join(box.dir, 'profile.json'), '{ "basics": ');
    let result = box.run();
    assert.equal(result.status, 1);
    assert.match(result.stderr, /not valid JSON/);

    const profile = fresh();
    profile.work[0].startDate = 'soon';
    writeFileSync(join(box.dir, 'profile.json'), JSON.stringify(profile));
    result = box.run();
    assert.equal(result.status, 1);
    assert.match(result.stderr, /work\/0\/startDate/);
    assert.equal(readFileSync(join(box.dir, 'resume.html'), 'utf8'), before);
  } finally {
    box.cleanup();
  }
});

test('CLI: an edit makes --check fail until the build is run', () => {
  const box = sandbox();
  try {
    const profile = fresh();
    profile.work[0].highlights[0] = 'Edited <highlight> & more.';
    profile.meta['x-portfolio'].quickView.role = 'New role';
    writeFileSync(join(box.dir, 'profile.json'), JSON.stringify(profile));
    assert.equal(box.run('--check').status, 1);
    assert.equal(box.run().status, 0);
    assert.equal(box.run('--check').status, 0);
    assert.match(readFileSync(join(box.dir, 'resume.html'), 'utf8'), /<li>Edited &lt;highlight&gt; &amp; more\.<\/li>/);
    assert.match(readFileSync(join(box.dir, 'index.html'), 'utf8'), /<p class="quick-role">New role<\/p>/);
  } finally {
    box.cleanup();
  }
});

test('CLI: missing quick-view markers fail the build', () => {
  const box = sandbox();
  try {
    const path = join(box.dir, 'index.html');
    writeFileSync(path, readFileSync(path, 'utf8').replace(/<!-- profile:quick-view:end -->/, ''));
    const result = box.run();
    assert.equal(result.status, 1);
    assert.match(result.stderr, /markers are missing/);
  } finally {
    box.cleanup();
  }
});
