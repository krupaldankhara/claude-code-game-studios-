import { AGENT_BY_ID } from '../data/studioCatalog';
import type {
  AgentEngineScope,
  DelegationStep,
  EngineId,
  StudioAgent,
  StudioSkill,
  WorkflowMode,
} from '../types/studio';

export interface ParsedStudioCommand {
  command: string;
  skillId: string;
  promptBody: string;
  flags: Record<string, string | boolean>;
}

export function parseStudioInput(rawInput: string): ParsedStudioCommand {
  const trimmed = rawInput.trim();
  const flags: Record<string, string | boolean> = {};

  if (!trimmed) {
    return { command: '/start', skillId: 'start', promptBody: '', flags };
  }

  let command = '/prototype';
  let remainder = trimmed;

  if (trimmed.startsWith('/')) {
    const firstSpace = trimmed.search(/\s/);
    if (firstSpace === -1) {
      command = trimmed.toLowerCase();
      remainder = '';
    } else {
      command = trimmed.slice(0, firstSpace).toLowerCase();
      remainder = trimmed.slice(firstSpace + 1).trim();
    }
  } else {
    const lower = trimmed.toLowerCase();
    if (
      lower.includes('architecture') ||
      lower.includes('adr') ||
      lower.includes('tech stack')
    ) {
      command = '/architecture-decision';
    } else if (lower.includes('sprint') || lower.includes('milestone')) {
      command = '/sprint-plan';
    } else if (lower.includes('art bible') || lower.includes('visual style')) {
      command = '/art-bible';
    } else if (lower.includes('review') || lower.includes('bug')) {
      command = '/code-review';
    } else if (lower.includes('balance') || lower.includes('economy')) {
      command = '/balance-check';
    } else if (lower.includes('design') || lower.includes('gdd')) {
      command = '/design-system';
    } else {
      command = '/prototype';
    }
  }

  // Extract --flag or --flag value tokens
  const tokens = remainder ? remainder.split(/\s+/) : [];
  const bodyTokens: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    if (tok.startsWith('--') && tok.length > 2) {
      const key = tok.slice(2);
      const next = tokens[i + 1];
      if (next && !next.startsWith('--')) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    } else {
      bodyTokens.push(tok);
    }
  }

  const skillId = command.replace(/^\//, '');
  return {
    command,
    skillId,
    promptBody: bodyTokens.join(' ').trim(),
    flags,
  };
}

function getEngineLeadSpecialist(engine: EngineId): string | null {
  switch (engine) {
    case 'Godot':
      return 'godot-specialist';
    case 'Unity':
      return 'unity-specialist';
    case 'Unreal':
      return 'unreal-specialist';
    default:
      return null;
  }
}

function makeStep(agentId: string, roleInRun: string): DelegationStep | null {
  const agent = AGENT_BY_ID[agentId];
  if (!agent) return null;
  return {
    agentId: agent.id,
    agentName: agent.name,
    tier: agent.tier,
    tierLabel: agent.tierLabel,
    department: agent.department,
    roleInRun,
  };
}

export function resolveDelegationChain(
  command: string,
  engine: EngineId,
  workflowMode: WorkflowMode,
  explicitAgentId?: string,
): DelegationStep[] {
  const skillId = command.replace(/^\//, '').toLowerCase();
  const steps: DelegationStep[] = [];
  const seen = new Set<string>();

  const push = (agentId: string | null | undefined, roleInRun: string) => {
    if (!agentId || seen.has(agentId)) return;
    const step = makeStep(agentId, roleInRun);
    if (step) {
      seen.add(agentId);
      steps.push(step);
    }
  };

  if (explicitAgentId && AGENT_BY_ID[explicitAgentId]) {
    const target = AGENT_BY_ID[explicitAgentId];
    if (workflowMode === 'full' && target.tier === 3 && AGENT_BY_ID[target.reportsTo]) {
      push(target.reportsTo, 'Department review and alignment');
    }
    push(target.id, 'Direct specialist consultation');
    return steps;
  }

  const engineSpecialist = getEngineLeadSpecialist(engine);

  if (skillId === 'prototype' || skillId === 'brainstorm') {
    if (workflowMode !== 'solo') {
      push('creative-director', 'Guard game identity, tone, and player fantasy');
    }
    push('game-designer', 'Structure core loop, feel, challenge, and one-page brief');
    push('prototyper', 'Build playable interactive vertical slice');
    if (engineSpecialist) {
      push(engineSpecialist, `Adapt prototype architecture for ${engine}`);
    }
    if (workflowMode !== 'solo') {
      push('qa-lead', 'Verify launch stability, input responsiveness, and brief coverage');
    }
    return steps;
  }

  if (
    skillId.includes('design') ||
    skillId === 'map-systems' ||
    skillId === 'review-all-gdds'
  ) {
    if (workflowMode === 'full') {
      push('creative-director', 'Validate pillar alignment and tone');
    }
    push('game-designer', 'Own system specification and design coherence');
    push('systems-designer', 'Define state machines, formulas, and edge cases');
    if (skillId.includes('balance') || skillId.includes('economy')) {
      push('economy-designer', 'Audit progression curves and resource sinks');
    }
    return steps;
  }

  if (skillId.includes('balance')) {
    push('game-designer', 'Verify difficulty curve against design intent');
    push('economy-designer', 'Model rewards, pacing curves, and exploit risks');
    push('qa-tester', 'Stress-test edge values and progression stalls');
    return steps;
  }

  if (
    skillId.includes('architecture') ||
    skillId.includes('adr') ||
    skillId.includes('setup-engine')
  ) {
    push('technical-director', 'Set architectural boundaries and trade-off criteria');
    push('lead-programmer', 'Draft concrete module contracts and ADR record');
    push(engineSpecialist || 'engine-programmer', `Validate ${engine} runtime constraints`);
    return steps;
  }

  if (skillId.includes('art') || skillId.includes('asset')) {
    if (workflowMode !== 'solo') {
      push('creative-director', 'Align visual pillars with game mood');
    }
    push('art-director', 'Author visual identity, palette, and silhouette rules');
    push('technical-artist', 'Specify shader budgets, rigging, and asset constraints');
    return steps;
  }

  if (skillId.includes('ux') || skillId.includes('ui')) {
    push('art-director', 'Maintain visual hierarchy and clarity');
    push('ux-designer', 'Map HUD ergonomics, player flows, and readability');
    push('ui-programmer', 'Plan responsive widget implementation');
    if (workflowMode === 'full') {
      push('accessibility-specialist', 'Audit contrast, remapping, and legibility');
    }
    return steps;
  }

  if (skillId.includes('sprint') || skillId.includes('story') || skillId === 'cut') {
    push('producer', 'Sequence milestones, scope cuts, and critical path');
    push('game-designer', 'Confirm feature priority against core loop');
    push('lead-programmer', 'Estimate technical complexity and risk');
    return steps;
  }

  if (skillId.includes('review') || skillId.includes('bug') || skillId.includes('test')) {
    if (workflowMode === 'full') {
      push('technical-director', 'Check architectural invariants');
    }
    push('lead-programmer', 'Inspect code modularity, edge cases, and regressions');
    push(engineSpecialist || 'gameplay-programmer', `Verify ${engine} gameplay patterns`);
    push('qa-lead', 'Compile reproduction checks and release gate verdict');
    return steps;
  }

  if (skillId.includes('audio') || skillId.includes('sound')) {
    push('audio-director', 'Establish musical mood and dynamic mixing tiers');
    push('sound-designer', 'Design foley cues, feedback stingers, and loop specs');
    return steps;
  }

  if (skillId.includes('narrative') || skillId.includes('lore') || skillId.includes('dialog')) {
    push('narrative-director', 'Maintain story arc, voice, and thematic weight');
    push('writer', 'Draft dialogue lines and barks');
    push('world-builder', 'Cross-check lore canon and environmental details');
    return steps;
  }

  // Default studio routing (/start, /next-step, /project-stage-detect, etc.)
  push('producer', 'Assess current production stage and sequence next milestone');
  push('creative-director', 'Clarify player experience and creative scope');
  push('technical-director', `Confirm ${engine} setup and readiness checks`);
  return steps;
}

export interface AgentFilterOptions {
  search: string;
  tier: 'all' | 1 | 2 | 3;
  engine: 'all' | AgentEngineScope;
  department: string;
}

export function filterAgents(
  agents: StudioAgent[],
  filters: AgentFilterOptions,
): StudioAgent[] {
  const query = filters.search.trim().toLowerCase();
  return agents.filter((agent) => {
    if (filters.tier !== 'all' && agent.tier !== filters.tier) return false;
    if (filters.engine !== 'all' && agent.engine !== filters.engine) return false;
    if (filters.department !== 'all' && agent.department !== filters.department) {
      return false;
    }
    if (!query) return true;
    return (
      agent.name.toLowerCase().includes(query) ||
      agent.id.toLowerCase().includes(query) ||
      agent.department.toLowerCase().includes(query) ||
      agent.description.toLowerCase().includes(query)
    );
  });
}

export function filterSkills(
  skills: StudioSkill[],
  search: string,
  category: string,
): StudioSkill[] {
  const query = search.trim().toLowerCase();
  return skills.filter((skill) => {
    if (category !== 'all' && skill.category !== category) return false;
    if (!query) return true;
    return (
      skill.command.toLowerCase().includes(query) ||
      skill.summary.toLowerCase().includes(query) ||
      skill.description.toLowerCase().includes(query) ||
      skill.category.toLowerCase().includes(query)
    );
  });
}
