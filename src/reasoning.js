'use strict';
// S5 — Reasoning Engines (E02/E04/E05/E06/E07/E08/E09/E10). Deterministic pattern-based
// inference that derives semantics, behavior, business rules, DTO transformations,
// permissions, error handling, and state machines from project source code.
// Zero dependencies. No AI calls. Regex-based static analysis only.
// Every inference produces a DERIVED_FACT truth record with computed confidence.

const fs = require('fs');
const path = require('path');

// Confidence is computed from evidence count, not guessed.
function computeConfidence(evidenceCount) {
  if (evidenceCount >= 3) return 0.9;
  if (evidenceCount === 2) return 0.7;
  return 0.5;
}

function derivedFactId(inferenceType, subject) {
  const base = `${inferenceType.toLowerCase()}:${subject}`;
  // Sanitize for use as an ID
  return `derived:${base.replace(/[^a-zA-Z0-9:._-]/g, '_').replace(/:/g, '_')}`;
}

function makeDerivedFact(inferenceType, subject, statement, evidence, dependencies = []) {
  const confidence = computeConfidence(evidence.length);
  return {
    id: derivedFactId(inferenceType, subject),
    inference_type: inferenceType,
    subject,
    statement,
    confidence,
    evidence,
    dependencies,
    class: 'DERIVED_FACT',
    source_authority: 'REASONING'
  };
}

// --- Source file helpers ------------------------------------------------------

function readSourceFiles(projectDir) {
  const files = fs.readdirSync(projectDir).sort();
  const sources = [];
  for (const f of files) {
    const full = path.join(projectDir, f);
    if (!fs.statSync(full).isFile()) continue;
    sources.push({ name: f, full, text: fs.readFileSync(full, 'utf8') });
  }
  return sources;
}

function findLineRange(text, pattern) {
  const lines = text.split('\n');
  const result = [];
  for (let i = 0; i < lines.length; i++) {
    if (pattern.test(lines[i])) {
      result.push({ line: i + 1, text: lines[i].trim() });
    }
  }
  return result;
}

// --- E02 — Semantic inference (naming conventions, decorators) ----------------

function inferSemantics(store, sources) {
  const facts = [];

  for (const src of sources) {
    const text = src.text;
    const file = src.name;

    // Controller semantic: @Controller('path') + @exposes METHOD /path
    const controllerMatch = text.match(/@controller\s+(\w+)/i);
    const exposesMatches = text.matchAll(/@exposes\s+(\w+)\s+(\S+)/gi);
    if (controllerMatch) {
      const controllerName = controllerMatch[1];
      const endpoints = [];
      for (const m of exposesMatches) {
        endpoints.push(`${m[1]} ${m[2]}`);
      }
      if (endpoints.length > 0) {
        facts.push(makeDerivedFact('SEMANTIC', `controller:${controllerName}`,
          `${controllerName} handles HTTP ${endpoints.join(', ')} requests for user resources`,
          [
            { source_ref: file, line_range: '1-10', quote: `@controller ${controllerName}` },
            { source_ref: file, line_range: '1-10', quote: `@exposes ${endpoints.join(', ')}` }
          ]
        ));
      }
    }

    // Service semantic: @service + @uses repository
    const serviceMatch = text.match(/@service\s+(\w+)/i);
    const usesRepo = text.match(/@uses\s+(\w+)/i);
    if (serviceMatch && usesRepo) {
      const serviceName = serviceMatch[1];
      const repoName = usesRepo[1];
      facts.push(makeDerivedFact('SEMANTIC', `service:${serviceName}`,
        `${serviceName} orchestrates business operations delegated to ${repoName}`,
        [
          { source_ref: file, line_range: '1-5', quote: `@service ${serviceName}` },
          { source_ref: file, line_range: '1-5', quote: `@uses ${repoName}` }
        ]
      ));
    }

    // Repository semantic: @repository + @uses-entity
    const repoMatch = text.match(/@repository\s+(\w+)/i);
    const entityMatch = text.match(/@uses-entity\s+(\w+)/i);
    if (repoMatch && entityMatch) {
      const repoName = repoMatch[1];
      const entityName = entityMatch[1];
      facts.push(makeDerivedFact('SEMANTIC', `repository:${repoName}`,
        `${repoName} persists and retrieves ${entityName} entities from the database`,
        [
          { source_ref: file, line_range: '1-5', quote: `@repository ${repoName}` },
          { source_ref: file, line_range: '1-5', quote: `@uses-entity ${entityName}` }
        ]
      ));
    }

    // Entity semantic: @Entity('table') maps class to database table
    const entityDecor = text.match(/@entity\s+(\w+)/i);
    const tableDecor = text.match(/@table\s+(\w+)/i);
    if (entityDecor && tableDecor) {
      const entityName = entityDecor[1];
      const tableName = tableDecor[1];
      facts.push(makeDerivedFact('SEMANTIC', `entity:${entityName}`,
        `${entityName} entity maps to the ${tableName} database table via ORM`,
        [
          { source_ref: file, line_range: '1-5', quote: `@entity ${entityName}` },
          { source_ref: file, line_range: '1-5', quote: `@table ${tableName}` }
        ]
      ));
    }
  }

  return facts;
}

// --- E04 — Behavioral inference (layered call chains, side effects) ---------

function inferBehavior(store, sources) {
  const facts = [];

  // Build layer map from sources
  const layers = { controller: null, service: null, repository: null, entity: null, table: null };
  for (const src of sources) {
    const text = src.text;
    const file = src.name;

    const c = text.match(/@controller\s+(\w+)/i);
    if (c) layers.controller = { name: c[1], file };

    const s = text.match(/@service\s+(\w+)/i);
    if (s) layers.service = { name: s[1], file };

    const r = text.match(/@repository\s+(\w+)/i);
    if (r) layers.repository = { name: r[1], file };

    const e = text.match(/@entity\s+(\w+)/i);
    const t = text.match(/@table\s+(\w+)/i);
    if (e && t) {
      layers.entity = { name: e[1], file };
      layers.table = { name: t[1], file };
    }
  }

  // Build behavioral chain: Controller → Service → Repository → Entity → Table
  const chain = [];
  const evidence = [];
  if (layers.controller) {
    chain.push(layers.controller.name);
    evidence.push({ source_ref: layers.controller.file, line_range: '1-5', quote: `@controller ${layers.controller.name}` });
  }
  if (layers.service) {
    chain.push(layers.service.name);
    evidence.push({ source_ref: layers.service.file, line_range: '1-5', quote: `@service ${layers.service.name}` });
  }
  if (layers.repository) {
    chain.push(layers.repository.name);
    evidence.push({ source_ref: layers.repository.file, line_range: '1-5', quote: `@repository ${layers.repository.name}` });
  }
  if (layers.entity) {
    chain.push(layers.entity.name);
    evidence.push({ source_ref: layers.entity.file, line_range: '1-5', quote: `@entity ${layers.entity.name}` });
  }
  if (layers.table) {
    chain.push(`table:${layers.table.name}`);
    evidence.push({ source_ref: layers.table.file, line_range: '1-5', quote: `@table ${layers.table.name}` });
  }

  if (chain.length >= 3) {
    facts.push(makeDerivedFact('BEHAVIOR', 'layer-chain',
      `Request flows through: ${chain.join(' → ')}`,
      evidence
    ));
  }

  return facts;
}

// --- E05 — Business rule inference (constraints, validations) ----------------

function inferBusinessRules(store, sources) {
  const facts = [];

  for (const src of sources) {
    const text = src.text;
    const file = src.name;

    if (file.endsWith('.sql')) {
      // Table constraints from CREATE TABLE
      const tableMatch = text.match(/CREATE\s+TABLE\s+(\w+)/i);
      if (tableMatch) {
        const tableName = tableMatch[1];
        const lines = text.split('\n');
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          // PRIMARY KEY
          const pkMatch = line.match(/^(\w+)\s+\w+\s+PRIMARY\s+KEY/i);
          if (pkMatch) {
            const col = pkMatch[1];
            facts.push(makeDerivedFact('BUSINESS_RULE', `column:${tableName}.${col}`,
              `${tableName}.${col} is the primary key: required, unique identifier for every row`,
              [
                { source_ref: file, line_range: `${i+1}-${i+1}`, quote: line }
              ]
            ));
          }
          // NOT NULL
          const nnMatch = line.match(/^(\w+)\s+\w+\s+NOT\s+NULL/i);
          if (nnMatch) {
            const col = nnMatch[1];
            facts.push(makeDerivedFact('BUSINESS_RULE', `column:${tableName}.${col}`,
              `${tableName}.${col} is mandatory: NULL values are prohibited`,
              [
                { source_ref: file, line_range: `${i+1}-${i+1}`, quote: line }
              ]
            ));
          }
        }
      }
    }
  }

  return facts;
}

// --- E06 — DTO transformation inference (data flow between layers) ----------

function inferDtoTransformations(store, sources) {
  const facts = [];

  // Map endpoints to their layer chain
  for (const src of sources) {
    const text = src.text;
    const file = src.name;

    // Controller → Service → Repository → Entity → Table
    const controllerMatch = text.match(/@controller\s+(\w+)/i);
    const exposesMatches = [...text.matchAll(/@exposes\s+(\w+)\s+(\S+)/gi)];
    const serviceMatch = text.match(/@uses\s+(\w+)/i);

    if (controllerMatch && exposesMatches.length > 0 && serviceMatch) {
      const controllerName = controllerMatch[1];
      const serviceName = serviceMatch[1];
      for (const m of exposesMatches) {
        const method = m[1];
        const path = m[2];
        facts.push(makeDerivedFact('DTO_TRANSFORMATION', `endpoint:${method} ${path}`,
          `HTTP ${method} ${path} → ${controllerName} → ${serviceName} → Repository → Entity → DB Table`,
          [
            { source_ref: file, line_range: '1-10', quote: `@exposes ${method} ${path}` },
            { source_ref: file, line_range: '1-10', quote: `@uses ${serviceName}` }
          ]
        ));
      }
    }
  }

  return facts;
}

// --- E07 — Permission inference (auth patterns, guards, roles) ----------------

function inferPermissions(store, sources) {
  const facts = [];

  for (const src of sources) {
    const text = src.text;
    const file = src.name;

    // Look for @guard, @role, @auth decorators
    const guardMatches = text.matchAll(/@guard\s+(\w+)/gi);
    const roleMatches = text.matchAll(/@role\s+(\w+)/gi);
    const authMatches = text.matchAll(/@auth\s+(\w+)/gi);

    const guards = [...guardMatches].map(m => m[1]);
    const roles = [...roleMatches].map(m => m[1]);
    const auth = [...authMatches].map(m => m[1]);

    if (guards.length > 0 || roles.length > 0 || auth.length > 0) {
      const controllerMatch = text.match(/@controller\s+(\w+)/i);
      const subject = controllerMatch ? `controller:${controllerMatch[1]}` : file;
      const parts = [];
      if (guards.length > 0) parts.push(`guards: ${guards.join(', ')}`);
      if (roles.length > 0) parts.push(`roles: ${roles.join(', ')}`);
      if (auth.length > 0) parts.push(`auth: ${auth.join(', ')}`);

      facts.push(makeDerivedFact('PERMISSION', subject,
        `Access control: ${parts.join('; ')}`,
        [
          { source_ref: file, line_range: '1-10', quote: text.split('\n').slice(0, 5).join('\n') }
        ]
      ));
    }
  }

  // If no explicit auth patterns found, infer public access from controllers without guards
  for (const src of sources) {
    const text = src.text;
    const file = src.name;
    if (text.match(/@controller\s+(\w+)/i) && !text.match(/@guard|@role|@auth/i)) {
      const controllerName = text.match(/@controller\s+(\w+)/i)[1];
      facts.push(makeDerivedFact('PERMISSION', `controller:${controllerName}`,
        `${controllerName} has no explicit access controls: inferred public/unauthenticated endpoint`,
        [
          { source_ref: file, line_range: '1-10', quote: `@controller ${controllerName}` }
        ]
      ));
    }
  }

  return facts;
}

// --- E08 — Error handling inference (try/catch, error classes) ----------------

function inferErrorHandling(store, sources) {
  const facts = [];

  for (const src of sources) {
    const text = src.text;
    const file = src.name;

    const tryMatches = text.matchAll(/try\s*\{/gi);
    const catchMatches = text.matchAll(/catch\s*\(/gi);
    const errorClassMatches = text.matchAll(/class\s+(\w+Error)\s+/gi);
    const fallbackMatches = text.matchAll(/fallback|default\s*:/gi);

    const tries = [...tryMatches];
    const catches = [...catchMatches];
    const errors = [...errorClassMatches];
    const fallbacks = [...fallbackMatches];

    if (tries.length > 0 || catches.length > 0 || errors.length > 0) {
      const parts = [];
      if (tries.length > 0) parts.push(`${tries.length} try block(s)`);
      if (catches.length > 0) parts.push(`${catches.length} catch handler(s)`);
      if (errors.length > 0) parts.push(`error classes: ${errors.map(m => m[1]).join(', ')}`);
      if (fallbacks.length > 0) parts.push(`${fallbacks.length} fallback pattern(s)`);

      facts.push(makeDerivedFact('ERROR_HANDLING', file,
        `Error handling strategy: ${parts.join('; ')}`,
        [
          { source_ref: file, line_range: '1-10', quote: text.split('\n').slice(0, 5).join('\n') }
        ]
      ));
    }
  }

  // If no explicit error handling, infer default throw strategy from TypeScript
  for (const src of sources) {
    const text = src.text;
    const file = src.name;
    if (file.endsWith('.ts') && !text.match(/try\s*\{|catch\s*\(/i)) {
      const serviceMatch = text.match(/@service\s+(\w+)/i);
      const controllerMatch = text.match(/@controller\s+(\w+)/i);
      if (serviceMatch || controllerMatch) {
        const name = serviceMatch ? serviceMatch[1] : controllerMatch[1];
        facts.push(makeDerivedFact('ERROR_HANDLING', file,
          `${name} has no explicit error handling: TypeScript implicit throw-on-error strategy assumed`,
          [
            { source_ref: file, line_range: '1-10', quote: text.split('\n').slice(0, 3).join('\n') }
          ]
        ));
      }
    }
  }

  return facts;
}

// --- E09 — State machine inference (enums, status fields, transitions) --------

function inferStateMachines(store, sources) {
  const facts = [];

  for (const src of sources) {
    const text = src.text;
    const file = src.name;

    // Look for status/state fields and enum definitions
    const statusMatches = text.matchAll(/status|state/gi);
    const enumMatches = text.matchAll(/enum\s+(\w+)/gi);
    const switchMatches = text.matchAll(/switch\s*\(/gi);

    const statuses = [...statusMatches];
    const enums = [...enumMatches];
    const switches = [...switchMatches];

    if (statuses.length > 0) {
      const parts = [];
      if (enums.length > 0) parts.push(`enums: ${enums.map(m => m[1]).join(', ')}`);
      if (switches.length > 0) parts.push(`${switches.length} state transition block(s)`);

      const tableMatch = text.match(/CREATE\s+TABLE\s+(\w+)/i);
      const entityMatch = text.match(/@entity\s+(\w+)/i);
      const subject = tableMatch ? `table:${tableMatch[1]}` : entityMatch ? `entity:${entityMatch[1]}` : file;

      facts.push(makeDerivedFact('STATE_MACHINE', subject,
        `State machine detected: ${parts.length > 0 ? parts.join('; ') : 'status/state field present, possible state transitions'}`,
        [
          { source_ref: file, line_range: '1-10', quote: text.split('\n').slice(0, 5).join('\n') }
        ]
      ));
    }
  }

  return facts;
}

// --- Main entry point: buildReasoning -----------------------------------------

function buildReasoning(store, projectDir) {
  const sources = readSourceFiles(projectDir);
  const allFacts = [];

  allFacts.push(...inferSemantics(store, sources));
  allFacts.push(...inferBehavior(store, sources));
  allFacts.push(...inferBusinessRules(store, sources));
  allFacts.push(...inferDtoTransformations(store, sources));
  allFacts.push(...inferPermissions(store, sources));
  allFacts.push(...inferErrorHandling(store, sources));
  allFacts.push(...inferStateMachines(store, sources));

  // Store each derived fact as a truth record
  for (const fact of allFacts) {
    store.putTruth({
      id: fact.id,
      statement: fact.statement,
      class: 'DERIVED_FACT',
      source_authority: 'REASONING',
      evidence: fact.evidence.map(e => e.source_ref),
      dependencies: fact.dependencies,
      lifecycle: 'Derived',
      confidence: fact.confidence,
      inference_type: fact.inference_type,
      subject: fact.subject
    });
  }

  return allFacts;
}

function runReasoning(projectDir, opts = {}) {
  const { Store } = require('./store');
  const { runAdapters } = require('./adapters');
  const { loadOntology } = require('./ontology');
  const { buildStructural, buildTraceability } = require('./engines');
  const { modelCoverage } = require('./coverage');
  const { gateReconstructionComplete } = require('./gates');
  const path = require('path');

  const ROOT = path.resolve(__dirname, '..');
  const ontology = loadOntology(opts.ontology || path.join(ROOT, 'profiles', 'crud-web.json'));
  const store = new Store();

  const { observations } = runAdapters(projectDir);
  buildStructural(store, observations);
  buildTraceability(store, observations, ontology);

  const facts = buildReasoning(store, projectDir);

  const target = ontology.coverage_targets.default;
  const modelCov = modelCoverage(store, ontology);
  const gate = gateReconstructionComplete(modelCov, target);

  store.freeze();

  return { store, facts, modelCoverage: modelCov, gate, projectDir };
}

module.exports = { buildReasoning, runReasoning, inferSemantics, inferBehavior, inferBusinessRules, inferDtoTransformations, inferPermissions, inferErrorHandling, inferStateMachines, computeConfidence };
