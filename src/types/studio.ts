export type EngineId = 'Web' | 'Godot' | 'Unity' | 'Unreal';
export type AgentEngineScope = 'Core' | 'Godot' | 'Unity' | 'Unreal';
export type WorkflowMode = 'full' | 'lean' | 'solo';
export type AutomationMode = 'guided' | 'collaborative' | 'autonomous';
export type WorkspaceTab = 'command' | 'agents' | 'skills' | 'governance' | 'config';

export interface StudioAgent {
  id: string;
  name: string;
  tier: 1 | 2 | 3;
  tierLabel: 'Director' | 'Department Lead' | 'Specialist';
  department: string;
  engine: AgentEngineScope;
  model: string;
  maxTurns: number;
  memory: string;
  tools: string[];
  disallowedTools: string[];
  reportsTo: string;
  description: string;
  mandate: string;
}

export interface StudioSkill {
  id: string;
  command: string;
  category: string;
  argumentHint: string;
  description: string;
  summary: string;
  sections: string[];
}

export interface StudioHook {
  id: string;
  file: string;
  event: string;
  trigger: string;
  action: string;
  severity: 'blocking' | 'warning' | 'lifecycle';
}

export interface StudioRule {
  id: string;
  file: string;
  title: string;
  paths: string[];
  scope: 'Always Loaded' | 'Path-Scoped';
  highlights: string[];
}

export interface EngineSpec {
  engine: EngineId;
  code_root: string;
  test_root: string;
  asset_root: string;
  run: string;
  build: string;
  test: string;
  smoke: string;
}

export interface ProjectConfig {
  projectName: string;
  slug: string;
  engine: EngineId;
  engineVersion: string;
  genre: string;
  workflowMode: WorkflowMode;
  automationMode: AutomationMode;
  directorGates: {
    creativeReview: boolean;
    architectureReview: boolean;
    qaReleaseGate: boolean;
  };
}

export type ArtifactKind =
  | 'brief'
  | 'gdd'
  | 'adr'
  | 'sprint'
  | 'review'
  | 'prototype'
  | 'art-bible'
  | 'code';

export interface StudioArtifact {
  id: string;
  title: string;
  path: string;
  kind: ArtifactKind;
  command: string;
  authorAgent: string;
  updatedAt: string;
  content: string;
  playableHtml?: string;
}

export interface DelegationStep {
  agentId: string;
  agentName: string;
  tier: 1 | 2 | 3;
  tierLabel: string;
  department: string;
  roleInRun: string;
  note?: string;
}

export interface QaCheckItem {
  item: string;
  status: 'pass' | 'needs-human-play' | 'check';
}

export interface StudioSessionTurn {
  id: string;
  createdAt: string;
  input: string;
  command: string;
  title: string;
  summary: string;
  delegation: DelegationStep[];
  artifactId: string;
  artifactPath: string;
  artifactKind: ArtifactKind;
  artifactContent: string;
  playableHtml?: string;
  qaChecklist: QaCheckItem[];
  recommendedNextCommands: string[];
}

export interface HookMatchResult {
  hook: StudioHook;
  outcome: 'blocked' | 'warning' | 'logged';
  reason: string;
}

export interface RuleMatchResult {
  rule: StudioRule;
  matchedGlob: string;
}

export interface GuardrailEvaluation {
  actionType: 'bash' | 'write' | 'read';
  target: string;
  triggeredHooks: HookMatchResult[];
  loadedRules: RuleMatchResult[];
  summary: string;
}
