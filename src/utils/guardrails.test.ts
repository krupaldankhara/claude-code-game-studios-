import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateGuardrails, matchGlob } from './guardrails';

test('matchGlob handles recursive wildcards and brace expansion case-insensitively', () => {
  assert.equal(matchGlob('src/gameplay/player.gd', 'src/gameplay/**'), true);
  assert.equal(
    matchGlob('Assets/Scripts/Gameplay/Combat.cs', 'Assets/**/{Gameplay,gameplay}/**/*.cs'),
    true,
  );
  assert.equal(matchGlob('assets/shaders/water.gdshader', '**/*.gdshader'), true);
  assert.equal(matchGlob('src/ui/hud.ts', 'src/gameplay/**'), false);
});

test('evaluateGuardrails flags protected branch pushes and git commits', () => {
  const pushEval = evaluateGuardrails('bash', 'git push origin main');
  assert.ok(
    pushEval.triggeredHooks.some(
      (h) => h.hook.file === 'validate-push.sh' && h.outcome === 'blocked',
    ),
  );

  const commitEval = evaluateGuardrails('bash', 'git commit -m "add fishing loop"');
  assert.ok(commitEval.triggeredHooks.some((h) => h.hook.file === 'validate-commit.sh'));
});

test('evaluateGuardrails warns on protected writes and registry edits', () => {
  const registryEval = evaluateGuardrails('write', 'design/registry/entities.yaml');
  assert.ok(
    registryEval.triggeredHooks.some((h) => h.hook.file === 'validate-registry.sh'),
  );

  const godotEval = evaluateGuardrails('write', 'project.godot');
  assert.ok(godotEval.triggeredHooks.some((h) => h.hook.file === 'validate-write.sh'));
});

test('evaluateGuardrails loads matching path-scoped rules on read', () => {
  const gameplayRead = evaluateGuardrails('read', 'src/gameplay/fishing_rod.gd');
  assert.ok(gameplayRead.loadedRules.some((r) => r.rule.id === 'gameplay-code'));

  const shaderRead = evaluateGuardrails('read', 'assets/shaders/dusk_water.gdshader');
  assert.ok(shaderRead.loadedRules.some((r) => r.rule.id === 'shader-code'));

  const protoRead = evaluateGuardrails('read', 'prototypes/duskwater/index.html');
  assert.ok(protoRead.loadedRules.some((r) => r.rule.id === 'prototype-code'));
});
