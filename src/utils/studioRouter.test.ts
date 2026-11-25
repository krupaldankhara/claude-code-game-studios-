import test from 'node:test';
import assert from 'node:assert/strict';
import {
  filterAgents,
  filterSkills,
  parseStudioInput,
  resolveDelegationChain,
} from './studioRouter';
import { STUDIO_AGENTS, STUDIO_SKILLS } from '../data/studioCatalog';

test('parseStudioInput parses slash command, flags, and prompt body', () => {
  const parsed = parseStudioInput(
    '/prototype a fishing game at dusk --path html --review lean --spike',
  );
  assert.equal(parsed.command, '/prototype');
  assert.equal(parsed.skillId, 'prototype');
  assert.equal(parsed.promptBody, 'a fishing game at dusk');
  assert.equal(parsed.flags.path, 'html');
  assert.equal(parsed.flags.review, 'lean');
  assert.equal(parsed.flags.spike, true);
});

test('parseStudioInput routes freeform prompts to matching studio skills', () => {
  assert.equal(
    parseStudioInput('Draft an architecture ADR for save states').command,
    '/architecture-decision',
  );
  assert.equal(
    parseStudioInput('Plan sprint 2 milestones').command,
    '/sprint-plan',
  );
  assert.equal(
    parseStudioInput('Build a cozy island farming game').command,
    '/prototype',
  );
});

test('resolveDelegationChain adapts to engine and workflow mode', () => {
  const godotFull = resolveDelegationChain('/prototype', 'Godot', 'full');
  const ids = godotFull.map((s) => s.agentId);
  assert.ok(ids.includes('creative-director'));
  assert.ok(ids.includes('game-designer'));
  assert.ok(ids.includes('prototyper'));
  assert.ok(ids.includes('godot-specialist'));
  assert.ok(ids.includes('qa-lead'));

  const webSolo = resolveDelegationChain('/prototype', 'Web', 'solo');
  const soloIds = webSolo.map((s) => s.agentId);
  assert.ok(!soloIds.includes('creative-director'));
  assert.ok(!soloIds.includes('qa-lead'));
  assert.ok(soloIds.includes('prototyper'));
});

test('resolveDelegationChain honors explicit specialist consultation', () => {
  const chain = resolveDelegationChain(
    '/code-review',
    'Unity',
    'full',
    'unity-shader-specialist',
  );
  assert.equal(chain[chain.length - 1].agentId, 'unity-shader-specialist');
  assert.equal(chain[0].agentId, 'lead-programmer');
});

test('filterAgents and filterSkills search across real studio catalog', () => {
  assert.equal(STUDIO_AGENTS.length, 49);
  assert.equal(STUDIO_SKILLS.length, 78);

  const godotAgents = filterAgents(STUDIO_AGENTS, {
    search: '',
    tier: 'all',
    engine: 'Godot',
    department: 'all',
  });
  assert.equal(godotAgents.length, 5);

  const protoSkills = filterSkills(STUDIO_SKILLS, 'prototype', 'all');
  assert.ok(protoSkills.some((s) => s.id === 'prototype'));
});
