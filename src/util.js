'use strict';
// S2 helper — canonical (deterministic) JSON + hashing + id ordering.
// Determinism law (spec II.3): sorted keys, sorted arrays of ids, no volatile fields.
const crypto = require('crypto');

function canonical(value) {
  if (value === undefined) return 'null';
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return '{' + keys.map(k => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
  }
  return JSON.stringify(value);
}

function sha256(s) { return crypto.createHash('sha256').update(s).digest('hex'); }

function byId(a, b) {
  const x = a.id, y = b.id;
  return x < y ? -1 : x > y ? 1 : 0;
}

module.exports = { canonical, sha256, byId };
