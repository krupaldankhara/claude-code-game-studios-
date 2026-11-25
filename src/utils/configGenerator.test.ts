import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateClaudeLocalMd,
  generateProjectYaml,
  getEngineSpec,
  slugifyProjectName,
} from './configGenerator';
import type { ProjectConfig } from '../types/studio';

const sampleConfig: ProjectConfig = {
  projectName: 'Duskwater Angler',
  slug: 'duskwater-angler',
  engine: 'Godot',
  engineVersion: '4.4',
  genre: 'Cozy Arcade / Fishing',
  workflowMode: 'lean',
  automationMode: 'collaborative',
  directorGates: {
    creativeReview: true,
    architectureReview: true,
    qaReleaseGate: false,
  },
};

test('slugifyProjectName produces clean lowercase slugs', () => {
  assert.equal(slugifyProjectName('Duskwater Angler!'), 'duskwater-angler');
  assert.equal(slugifyProjectName('   '), 'untitled-game');
});

test('getEngineSpec resolves exact engines.tsv paths', () => {
  assert.equal(getEngineSpec('Godot').code_root, 'src');
  assert.equal(getEngineSpec('Unity').code_root, 'Assets');
  assert.equal(getEngineSpec('Unreal').code_root, 'Source');
  assert.equal(getEngineSpec('Web').run, 'npm run dev');
});

test('generateProjectYaml and generateClaudeLocalMd include configured values', () => {
  const yaml = generateProjectYaml(sampleConfig);
  assert.ok(yaml.includes('name: "Duskwater Angler"'));
  assert.ok(yaml.includes('name: "Godot"'));
  assert.ok(yaml.includes('workflow: "lean"'));
  assert.ok(yaml.includes('qa_release_gate: false'));

  const localMd = generateClaudeLocalMd(sampleConfig);
  assert.ok(localMd.includes('Godot (4.4)'));
  assert.ok(localMd.includes('QA Release Gate: Disabled'));
});
