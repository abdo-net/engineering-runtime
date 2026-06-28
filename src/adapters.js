'use strict';
// S3 — Adapter Framework. Pure, deterministic parsers that turn project sources into
// typed observations: { kind:'node'|'rel', ... }. Zero-dependency regex parsers over a
// realistic NestJS/TypeORM-style fixture. Each observation carries a source_ref; a parse
// failure marks the region UNSUPPORTED (it never fabricates).
const fs = require('fs');
const path = require('path');

const node = (cls, id, name, ref) => ({ kind: 'node', class: cls, id, name, source_ref: ref });
const rel  = (type, from, to, ref) => ({ kind: 'rel', type, from, to, source_ref: ref });

// --- db.sql : CREATE TABLE <t> ( <cols> ) ---------------------------------------
function sqlddl(file, text) {
  const obs = [];
  const re = /CREATE\s+TABLE\s+(\w+)\s*\(([\s\S]*?)\)\s*;/gi;
  let m;
  while ((m = re.exec(text))) {
    const table = m[1];
    obs.push(node('Table', `table:${table}`, table, `${file}`));
    for (const line of m[2].split('\n')) {
      const c = line.trim().match(/^(\w+)\s+\w+/);
      if (c && c[1].toUpperCase() !== 'PRIMARY') {
        const col = c[1];
        obs.push(node('Column', `column:${table}.${col}`, `${table}.${col}`, `${file}`));
      }
    }
  }
  return obs;
}

// --- *.entity.ts : @entity/@table + @Column fields, mapping field -> column --------
function entity(file, text) {
  const obs = [];
  const ename = (text.match(/@entity\s+(\w+)/i) || [])[1];
  const table = (text.match(/@table\s+(\w+)/i) || [])[1];
  if (!ename) return obs;
  obs.push(node('Entity', `entity:${ename}`, ename, file));
  const colRe = /@Column\(\)\s+(\w+)\s*:/g;
  let m;
  while ((m = colRe.exec(text))) {
    const f = m[1];
    obs.push(node('Field', `field:${ename}.${f}`, `${ename}.${f}`, file));
    obs.push(rel('field-of', `field:${ename}.${f}`, `entity:${ename}`, file));
    if (table) obs.push(rel('maps', `column:${table}.${f}`, `field:${ename}.${f}`, file));
  }
  return obs;
}

// --- *.repository.ts : @repository + @uses-entity ----------------------------------
function repository(file, text) {
  const obs = [];
  const r = (text.match(/@repository\s+(\w+)/i) || [])[1];
  const e = (text.match(/@uses-entity\s+(\w+)/i) || [])[1];
  if (!r) return obs;
  obs.push(node('Repository', `repository:${r}`, r, file));
  if (e) obs.push(rel('persisted-by', `entity:${e}`, `repository:${r}`, file));
  return obs;
}

// --- *.service.ts : @service + @uses <Repository> ----------------------------------
function service(file, text) {
  const obs = [];
  const s = (text.match(/@service\s+(\w+)/i) || [])[1];
  const u = (text.match(/@uses\s+(\w+)/i) || [])[1];
  if (!s) return obs;
  obs.push(node('Service', `service:${s}`, s, file));
  if (u) obs.push(rel('used-by-service', `repository:${u}`, `service:${s}`, file));
  return obs;
}

// --- *.controller.ts : @controller + @uses <Service> + @exposes <METHOD> <path> -----
function controller(file, text) {
  const obs = [];
  const c = (text.match(/@controller\s+(\w+)/i) || [])[1];
  const u = (text.match(/@uses\s+(\w+)/i) || [])[1];
  if (!c) return obs;
  obs.push(node('Controller', `controller:${c}`, c, file));
  if (u) obs.push(rel('used-by-controller', `service:${u}`, `controller:${c}`, file));
  const ex = /@exposes\s+(\w+)\s+(\S+)/gi;
  let m;
  while ((m = ex.exec(text))) {
    const id = `endpoint:${m[1]} ${m[2]}`;
    obs.push(node('Endpoint', id, `${m[1]} ${m[2]}`, file));
    obs.push(rel('exposes', `controller:${c}`, id, file));
    obs.push(rel('documented-by', id, `openapi:${m[2]}`, file)); // matched against openapi.json
  }
  return obs;
}

// --- openapi.json : paths -> OpenAPI nodes -----------------------------------------
function openapi(file, text) {
  const obs = [];
  let doc;
  try { doc = JSON.parse(text); } catch { return [{ kind: 'unsupported', source_ref: file }]; }
  for (const p of Object.keys(doc.paths || {}).sort()) {
    obs.push(node('OpenAPI', `openapi:${p}`, p, file));
  }
  return obs;
}

const REGISTRY = [
  { match: f => f.endsWith('.sql'),            run: sqlddl },
  { match: f => f.endsWith('.entity.ts'),      run: entity },
  { match: f => f.endsWith('.repository.ts'),  run: repository },
  { match: f => f.endsWith('.service.ts'),     run: service },
  { match: f => f.endsWith('.controller.ts'),  run: controller },
  { match: f => f.endsWith('openapi.json'),    run: openapi }
];

// Deterministic: files processed in sorted order.
function runAdapters(projectDir) {
  const files = fs.readdirSync(projectDir).sort();
  const observations = [];
  const unsupported = [];
  for (const f of files) {
    const full = path.join(projectDir, f);
    const text = fs.readFileSync(full, 'utf8');
    for (const a of REGISTRY) {
      if (!a.match(f)) continue;
      for (const o of a.run(f, text)) {
        if (o.kind === 'unsupported') unsupported.push(o.source_ref);
        else observations.push(o);
      }
    }
  }
  return { observations, unsupported };
}

module.exports = { runAdapters };
