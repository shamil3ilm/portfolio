// Tailored résumé pages: variants/<slug>.json -> resume/<slug>.html.
// Run: node --test "scripts/test/*.test.mjs"
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { checkProfile } from '../lib/profile.mjs';
import { fillTemplate, mainPage, resumeValues, variantPage } from '../lib/render.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8').replace(/\r\n/g, '\n');
const schema = JSON.parse(read('scripts/profile.schema.json'));

/** A synthetic variant built from the committed profile: one job, one highlight, its own wording. */
function variantDoc(slug) {
  const doc = JSON.parse(read('profile.json'));
  const job = doc.work[0];
  job.highlights = ['Synthetic highlight for a tailored test page.'];
  doc.work = [job];
  doc.basics.label = 'Synthetic Tailored Headline';
  doc.basics.summary = 'Synthetic summary written only for this test.';
  const x = doc.meta['x-portfolio'];
  x.order.work = [job.name];
  x.caseStudies = x.caseStudies.filter((c) => c.work === job.name).map((c) => ({ ...c, highlight: 0 })).slice(0, 1);
  doc.meta.canonical = `${new URL(doc.meta.canonical).origin}/variants/${slug}.json`;
  return doc;
}

function sandbox() {
  const dir = mkdtempSync(join(tmpdir(), 'variant-build-'));
  for (const item of ['profile.json', 'resume.html', 'index.html', 'scripts']) {
    cpSync(join(ROOT, item), join(dir, item), { recursive: true });
  }
  const run = (...args) => spawnSync(process.execPath, [join(dir, 'scripts', 'build-resume.mjs'), ...args], { encoding: 'utf8' });
  const writeVariant = (name, doc) => {
    mkdirSync(join(dir, 'variants'), { recursive: true });
    writeFileSync(join(dir, 'variants', name), typeof doc === 'string' ? doc : JSON.stringify(doc, null, 2));
  };
  const page = (slug) => join(dir, 'resume', `${slug}.html`);
  return { dir, run, writeVariant, page, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

function withBox(fn) {
  const box = sandbox();
  try {
    fn(box);
  } finally {
    box.cleanup();
  }
}

test('the synthetic variant is valid under the same schema', () => {
  assert.deepEqual(checkProfile(variantDoc('backend-gcc'), schema), []);
});

test('page values: the main page keeps its markup, a variant page gets base, noindex and a label', () => {
  const template = read('scripts/resume.template.html');
  const main = JSON.parse(read('profile.json'));
  assert.equal(mainPage(main).url, 'https://mohamed3shamil.vercel.app/resume.html');
  assert.equal(fillTemplate(template, resumeValues(main), 'resume'), read('resume.html'));

  const doc = variantDoc('backend-gcc');
  const html = fillTemplate(template, resumeValues(doc, variantPage(doc, 'backend-gcc')), 'resume');
  const url = 'https://mohamed3shamil.vercel.app/resume/backend-gcc.html';
  assert.ok(html.includes(`<link rel="canonical" href="${url}">`));
  assert.ok(html.includes(`<meta property="og:url" content="${url}">`));
  assert.ok(html.includes('<base href="../">'));
  assert.ok(html.includes('<meta name="robots" content="noindex">'));
  assert.ok(html.includes('<p class="eyebrow">Tailored résumé</p>'));
  assert.ok(html.includes('<link rel="stylesheet" href="styles.css">'));
  assert.ok(html.includes('<a href="resume/backend-gcc.html#top">Back to top'));
  assert.ok(html.includes('<!-- Generated from variants/backend-gcc.json by scripts/build-resume.mjs.'));
  assert.ok(!html.includes('aria-current="page"'));
  assert.ok(html.includes('<p class="resume-role">Synthetic Tailored Headline</p>'));
  assert.ok(html.includes('<li>Synthetic highlight for a tailored test page.</li>'));
});

test('CLI: no variants folder leaves the build unchanged', () => {
  withBox((box) => {
    const result = box.run();
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /profile\.json is valid\. Pages already up to date\./);
    assert.equal(existsSync(join(box.dir, 'resume')), false);
    assert.equal(box.run('--check').status, 0);
  });
});

test('CLI: a valid variant renders resume/<slug>.html; --check catches missing and stale pages', () => {
  withBox((box) => {
    box.writeVariant('backend-gcc.json', variantDoc('backend-gcc'));
    let check = box.run('--check');
    assert.equal(check.status, 1);
    assert.match(check.stderr, /Stale or missing generated file\(s\): resume\/backend-gcc\.html/);

    const result = box.run();
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Wrote resume\/backend-gcc\.html/);
    const html = readFileSync(box.page('backend-gcc'), 'utf8');
    assert.match(html, /<meta name="robots" content="noindex">/);
    assert.match(html, /Tailored résumé/);
    assert.equal(box.run('--check').status, 0);

    const edited = variantDoc('backend-gcc');
    edited.basics.label = 'Another Synthetic Headline';
    box.writeVariant('backend-gcc.json', edited);
    check = box.run('--check');
    assert.equal(check.status, 1);
    assert.match(check.stderr, /resume\/backend-gcc\.html/);
  });
});

test('CLI: an invalid variant fails the build and writes nothing', () => {
  withBox((box) => {
    const before = readFileSync(join(box.dir, 'resume.html'), 'utf8');
    box.writeVariant('good.json', variantDoc('good'));
    const bad = variantDoc('bad');
    bad.work[0].startDate = 'soon';
    box.writeVariant('bad.json', bad);
    const result = box.run();
    assert.equal(result.status, 1);
    assert.match(result.stderr, /variants\/bad\.json is invalid/);
    assert.match(result.stderr, /work\/0\/startDate/);
    assert.equal(existsSync(join(box.dir, 'resume')), false);
    assert.equal(readFileSync(join(box.dir, 'resume.html'), 'utf8'), before);

    box.writeVariant('bad.json', '{ "basics": ');
    assert.match(box.run().stderr, /variants\/bad\.json is not valid JSON/);
  });
});

test('CLI: bad file names and a canonical that is not the file’s own address fail', () => {
  withBox((box) => {
    box.writeVariant('Bad_Name.json', variantDoc('bad-name'));
    assert.match(box.run().stderr, /variants\/Bad_Name\.json: only <slug>\.json files belong here/);
  });
  withBox((box) => {
    box.writeVariant('notes.txt', 'hello');
    assert.match(box.run().stderr, /variants\/notes\.txt: only <slug>\.json/);
  });
  withBox((box) => {
    box.writeVariant('backend-gcc.json', variantDoc('other-slug'));
    const result = box.run();
    assert.equal(result.status, 1);
    assert.match(result.stderr, /meta\/canonical: .* must end in \/variants\/backend-gcc\.json/);
    assert.equal(existsSync(join(box.dir, 'resume')), false);
  });
});

test('CLI: unpublishing a variant deletes its generated page; --check reports the orphan first', () => {
  withBox((box) => {
    box.writeVariant('one.json', variantDoc('one'));
    box.writeVariant('two.json', variantDoc('two'));
    assert.equal(box.run().status, 0);
    rmSync(join(box.dir, 'variants', 'two.json'));

    const check = box.run('--check');
    assert.equal(check.status, 1);
    assert.match(check.stderr, /Generated page\(s\) with no variant: resume\/two\.html/);

    const result = box.run();
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Removed resume\/two\.html/);
    assert.deepEqual(readdirSync(join(box.dir, 'resume')), ['one.html']);

    rmSync(join(box.dir, 'variants', 'one.json'));
    assert.equal(box.run().status, 0);
    assert.equal(existsSync(join(box.dir, 'resume')), false);
    assert.equal(box.run('--check').status, 0);
  });
});

test('CLI: a hand-written file in resume/ is never deleted or overwritten', () => {
  withBox((box) => {
    mkdirSync(join(box.dir, 'resume'));
    writeFileSync(join(box.dir, 'resume', 'notes.html'), '<p>mine</p>');
    let result = box.run();
    assert.equal(result.status, 1);
    assert.match(result.stderr, /move these file\(s\) elsewhere: resume\/notes\.html/);
    assert.equal(readFileSync(join(box.dir, 'resume', 'notes.html'), 'utf8'), '<p>mine</p>');

    rmSync(join(box.dir, 'resume', 'notes.html'));
    writeFileSync(box.page('one'), '<p>also mine</p>');
    box.writeVariant('one.json', variantDoc('one'));
    result = box.run();
    assert.equal(result.status, 1);
    assert.match(result.stderr, /resume\/one\.html/);
    assert.equal(readFileSync(box.page('one'), 'utf8'), '<p>also mine</p>');
  });
});
