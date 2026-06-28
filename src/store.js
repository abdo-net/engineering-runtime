'use strict';
// S2 — Store / Persistence Layer. In-memory model with deterministic ordering and
// a canonical serializer. Disk persistence writes one JSON file per object; for the
// runnable core the authoritative view is serialize(), which the det-harness compares.
const { byId } = require('./util');

class Store {
  constructor() {
    this.nodes = new Map();
    this.edges = new Map();
    this.truth = new Map();
    this._frozen = false;
  }
  putNode(n) { this._guard(); this.nodes.set(n.id, n); return n.id; }
  putEdge(e) { this._guard(); this.edges.set(e.id, e); return e.id; }
  putTruth(t) { this._guard(); this.truth.set(t.id, t); return t.id; }
  getNode(id) { return this.nodes.get(id) || null; }
  hasNode(id) { return this.nodes.has(id); }
  allNodes() { return [...this.nodes.values()].sort(byId); }
  allEdges() { return [...this.edges.values()].sort(byId); }
  allTruth() { return [...this.truth.values()].sort(byId); }
  // deterministic: edges leaving a node, in id order
  outFrom(id) { return this.allEdges().filter(e => e.from === id); }
  freeze() { this._frozen = true; }
  _guard() { if (this._frozen) throw new Error('E_IMMUTABLE'); }
  serialize() {
    return { nodes: this.allNodes(), edges: this.allEdges(), truth: this.allTruth() };
  }
}

module.exports = { Store };
