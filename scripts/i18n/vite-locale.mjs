// Vite plugin: rewrites user-visible English string literals in src/ to another
// language at build time, using an English -> target dictionary (docs/i18n/<lang>.json).
// Same technique the RU -> EN migration used, but applied per build so one source
// produces /play/ (English) and /es/play/ (Spanish).
import ts from 'typescript';
import {readFileSync} from 'node:fs';

const norm = s => s.replace(/\s+/g, ' ').trim();
// JSON keys whose values are identifiers, not text.
const JSON_SKIP = new Set(['id','family','skill','type','fen','player','source','tags','solutions','choices','line','kind','eventName','animation','sound','video','key','src','icon','image']);

export function loadDictionary(lang) {
  const raw = JSON.parse(readFileSync(new URL(`../../docs/i18n/${lang}.json`, import.meta.url), 'utf8'));
  return new Map(Object.entries(raw).map(([en, value]) => [norm(en), value]));
}

function translateText(dict, text) {
  const value = dict.get(norm(text));
  if (value === undefined) return null;
  const before = text.match(/^\s*/)[0], after = text.match(/\s*$/)[0];
  return before + value + after;
}

export function translateSource(code, file, dict) {
  const sf = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const edits = [];
  (function visit(node) {
    // Whole template first: "Another {} {}" style keys keep Spanish word order around ${...}.
    if (ts.isTemplateExpression(node)) {
      const key = node.head.text + node.templateSpans.map(s => '{}' + s.literal.text).join('');
      const value = dict.get(norm(key));
      if (value !== undefined) {
        const parts = value.split('{}');
        if (parts.length !== node.templateSpans.length + 1) throw Error(`Placeholder count differs for "${key}"`);
        const escape = t => t.replaceAll('\\', '\\\\').replaceAll('`', '\\`').replaceAll('${', '\\${');
        const lead = node.head.text.match(/^\s*/)[0], trail = node.templateSpans.at(-1).literal.text.match(/\s*$/)[0];
        let out = '`' + escape(lead + parts[0]);
        node.templateSpans.forEach((span, i) => { out += '${' + span.expression.getText(sf) + '}' + escape(parts[i + 1] + (i === node.templateSpans.length - 1 ? trail : '')); });
        edits.push([node.getStart(sf), node.end, out + '`']);
        return;
      }
    }
    if (ts.isJsxText(node)) {
      const value = translateText(dict, node.text);
      if (value !== null && node.text.trim()) edits.push([node.pos, node.end, value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('{', '&#123;').replaceAll('}', '&#125;')]);
    } else if (ts.isStringLiteral(node) && !ts.isImportDeclaration(node.parent) && !ts.isExportDeclaration(node.parent) && !(ts.isPropertyAssignment(node.parent) && node.parent.name === node) && !ts.isLiteralTypeNode(node.parent)) {
      const value = translateText(dict, node.text);
      if (value !== null) edits.push([node.getStart(sf), node.end, JSON.stringify(value)]);
    } else if (ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) {
      const value = translateText(dict, node.text);
      if (value !== null) {
        const start = node.getStart(sf), raw = code.slice(start, node.end);
        const open = raw[0], close = ts.isTemplateHead(node) || ts.isTemplateMiddle(node) ? '${' : '`';
        edits.push([start, node.end, open + value.replaceAll('\\', '\\\\').replaceAll('`', '\\`').replaceAll('${', '\\${') + close]);
      }
    }
    ts.forEachChild(node, visit);
  })(sf);
  let out = code;
  for (const [a, b, v] of edits.sort((x, y) => y[0] - x[0])) out = out.slice(0, a) + v + out.slice(b);
  return {code: out, count: edits.length};
}

export function translateJson(text, dict) {
  let count = 0;
  const visit = (value, key) => {
    if (typeof value === 'string') {
      if (key && JSON_SKIP.has(key)) return value;
      const t = translateText(dict, value);
      if (t === null) return value;
      count++; return t;
    }
    if (Array.isArray(value)) return value.map(v => visit(v, key));
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, visit(v, k)]));
    return value;
  };
  return {code: JSON.stringify(visit(JSON.parse(text))), count};
}

export default function chezziesLocale(lang) {
  if (!lang || lang === 'en') return {name: 'chezzies-locale'};
  const dict = loadDictionary(lang);
  return {
    name: 'chezzies-locale',
    enforce: 'pre',
    transform(code, id) {
      const file = id.split('?')[0].replaceAll('\\', '/');
      if (!file.includes('/src/') || file.includes('/node_modules/') || /\.test\./.test(file)) return null;
      if (/\.tsx?$/.test(file)) { const r = translateSource(code, file, dict); return r.count ? {code: r.code, map: null} : null; }
      if (file.endsWith('.json')) { const r = translateJson(code, dict); return r.count ? {code: r.code, map: null} : null; }
      if (file.endsWith('.css')) { let n = 0; const out = code.replace(/content:\s*(['"])([^'"]*[A-Za-z][^'"]*)\1/g, (m, q, text) => { const t = translateText(dict, text); if (t === null) return m; n++; return `content:${q}${t}${q}`; }); return n ? {code: out, map: null} : null; }
      return null;
    }
  };
}
