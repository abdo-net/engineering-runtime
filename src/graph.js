'use strict';
// S6 — Graph Service + Impact (E12). Deterministic forward BFS along impact-
// propagating edges from a target node. The closure is returned as a LOWER BOUND
// with a coverage stamp (I-3): absence of an edge is not proof of no dependency.
const { measureClosure } = require('./coverage');

function impact(store, ontology, targetId) {
  if (!store.hasNode(targetId)) {
    return { target: targetId, error: 'E_NO_SUCH_NODE', nodes: [], lower_bound: true };
  }
  const visited = new Set();
  const order = [];
  const queue = [targetId];
  while (queue.length) {
    const n = queue.shift();
    if (visited.has(n)) continue;
    visited.add(n);
    order.push(n);
    // deterministic: outFrom returns edges in id order
    for (const e of store.outFrom(n)) {
      if (e.propagates && ontology.propagatingTypes.has(e.type) && !visited.has(e.to)) {
        queue.push(e.to);
      }
    }
  }
  const coverage = measureClosure(store, ontology, order);
  return { target: targetId, nodes: order, count: order.length, lower_bound: true, ...coverage };
}

module.exports = { impact };
