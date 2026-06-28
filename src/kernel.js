'use strict';
// S1 — Kernel Bridge. Loads and verifies the frozen Kernel pin (kernel.lock).
// Full hash verification requires git; the runnable core verifies the pinned path
// exists and surfaces the pinned commit. It NEVER writes to the Kernel (read-only).
const fs = require('fs');
const path = require('path');

function loadKernel(lockPath) {
  const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
  const kernelPath = path.resolve(path.dirname(lockPath), lock.kernel_path);
  const verified = fs.existsSync(kernelPath) &&
                   fs.existsSync(path.join(kernelPath, '01-META-MODEL'));
  return {
    lock,
    kernelPath,
    verified,
    // Runtime objects map to these frozen RMM entities as §9.7 extensions (read-only).
    entityMap: {
      node: 'TOPOLOGY/ASSEMBLY', edge: 'TRACEABILITY_LINK', truth: 'FINDING',
      decision: 'DECISION', plan: 'PLAN', package: 'SNAPSHOT', evidence: 'EVIDENCE'
    }
  };
}

module.exports = { loadKernel };
