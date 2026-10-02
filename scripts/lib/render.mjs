// Turns a validated profile into HTML fragments and fills the page templates.

import { ordered, findProfile } from './profile.mjs';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const esc = escapeHtml;

/** "2025-12" -> "Dec 2025", "2021" -> "2021" (US-style month names, as on the site). */
export function formatDate(iso) {
  const [year, month] = iso.split('-');
  return month ? `${MONTHS[Number(month) - 1]} ${year}` : year;
}

export function formatRange(start, end) {
  return `${formatDate(start)} – ${end ? formatDate(end) : 'Present'}`;
}

/** "https://example.com/" -> "example.com" for link text. */
export function displayHost(url) {
  const u = new URL(url);
  return (u.host + u.pathname).replace(/\/$/, '');
}

function indent(lines, spaces) {
  const pad = ' '.repeat(spaces);
  return lines.map((line) => pad + line).join('\n');
}

function bulletList(items) {
  return ['<ul>', ...items.map((text) => `  <li>${esc(text)}</li>`), '</ul>'];
}

function resumeLine(what, when, whenClass = 'resume-when') {
  return `<p class="resume-line"><span class="resume-what"><strong>${esc(what)}</strong></span><span class="${whenClass}">${esc(when)}</span></p>`;
}

function renderWork(job) {
  const org = job.location ? `${job.name}, ${job.location}` : job.name;
  return [
    '<div class="resume-job">',
    '  ' + resumeLine(job.position, formatRange(job.startDate, job.endDate)),
    `  <p class="resume-org">${esc(org)}</p>`,
    ...bulletList(job.highlights).map((l) => '  ' + l),
    '</div>',
  ];
}

function renderProject(project) {
  const title = project.description ? `${project.name} – ${project.description}` : project.name;
  return [
    '<div class="resume-job">',
    '  ' + resumeLine(title, project.keywords.join(', '), 'resume-when resume-stack'),
    ...bulletList(project.highlights).map((l) => '  ' + l),
    '</div>',
  ];
}

function renderEducation(edu) {
  const when = edu.endDate ? formatRange(edu.startDate, edu.endDate) : formatRange(edu.startDate);
  return [
    '<div class="resume-job">',
    '  ' + resumeLine(`${edu.studyType} in ${edu.area}`, when),
    `  <p class="resume-org"><em>${esc(edu.institution)}</em></p>`,
    '</div>',
  ];
}

function renderContact(basics) {
  const links = [
    `<a href="mailto:${esc(basics.email)}">${esc(basics.email)}</a>`,
    ...basics.profiles.map((p) => `<a href="${esc(p.url)}">${esc(p.network)}</a>`),
    `<a href="${esc(basics.url)}">${esc(displayHost(basics.url))}</a>`,
  ];
  return links.join(' | ');
}

function renderQuickResult(result) {
  let link = '';
  if (result.link) {
    const { href, label, closesDialog } = result.link;
    const external = href.startsWith('https://') ? ' target="_blank" rel="noopener"' : '';
    const closes = closesDialog ? ' data-quick-close' : '';
    link = ` <a href="${esc(href)}"${closes}${external}>${esc(label)}</a>`;
  }
  return `<li><strong>${esc(result.lead)}</strong> ${esc(result.text)}${link}</li>`;
}

function renderQuickProfiles(profiles) {
  return profiles.map(
    (p) => `<a class="btn btn-ghost" href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.network)}</a>`,
  );
}

/** Values for the résumé template. Keys in "blocks" are raw HTML, the rest are escaped text. */
export function resumeValues(profile) {
  const { basics } = profile;
  const x = profile.meta['x-portfolio'];
  return {
    text: {
      name: basics.name,
      displayName: x.displayName,
      label: basics.label,
      summary: basics.summary,
      email: basics.email,
      githubUrl: findProfile(profile, 'GitHub').url,
      linkedinUrl: findProfile(profile, 'LinkedIn').url,
    },
    blocks: {
      contact: renderContact(basics),
      work: indent(ordered(profile, 'work').flatMap(renderWork), 8),
      projects: indent(ordered(profile, 'projects').flatMap(renderProject), 8),
      skills: indent(ordered(profile, 'skills').map((s) => `<p><strong>${esc(s.name)}:</strong> ${esc(s.keywords.join(', '))}</p>`), 8),
      education: indent(ordered(profile, 'education').flatMap(renderEducation), 8),
    },
  };
}

/** Values for the 60-second view template. */
export function quickViewValues(profile) {
  const q = profile.meta['x-portfolio'].quickView;
  return {
    text: {
      displayName: profile.meta['x-portfolio'].displayName,
      role: q.role,
      line: q.line,
      email: profile.basics.email,
    },
    blocks: {
      results: indent(q.results.map(renderQuickResult), 8),
      skills: q.skills.map((s) => `<span>${esc(s)}</span>`).join(''),
      profiles: indent(renderQuickProfiles(profile.basics.profiles), 8),
    },
  };
}

/** Replaces {{key}} (escaped text) and {{{key}}} (raw HTML). Unknown or unused keys are errors. */
export function fillTemplate(template, { text, blocks }, name) {
  const used = new Set();
  const out = template.replace(/\{\{\{(\w+)\}\}\}|\{\{(\w+)\}\}/g, (match, rawKey, textKey) => {
    const key = rawKey || textKey;
    const source = rawKey ? blocks : text;
    if (!(key in source)) throw new Error(`${name}: unknown placeholder ${match}`);
    used.add((rawKey ? 'block:' : 'text:') + key);
    return rawKey ? source[key] : esc(source[key]);
  });
  const unused = [
    ...Object.keys(text).filter((k) => !used.has('text:' + k)),
    ...Object.keys(blocks).filter((k) => !used.has('block:' + k)),
  ];
  if (unused.length) throw new Error(`${name}: template never uses ${unused.join(', ')}`);
  return out;
}
