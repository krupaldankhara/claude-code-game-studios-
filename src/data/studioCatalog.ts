import rawCatalog from './studioCatalog.json';
import type {
  EngineSpec,
  StudioAgent,
  StudioHook,
  StudioRule,
  StudioSkill,
} from '../types/studio';

interface RawCatalog {
  agents: StudioAgent[];
  skills: StudioSkill[];
  hooks: StudioHook[];
  rules: StudioRule[];
  engines: EngineSpec[];
}

const catalog = rawCatalog as RawCatalog;

function normalizeCategory(category: string): string {
  if (category.toLowerCase().includes('overlap')) {
    return 'Reviews & Analysis';
  }
  return category;
}

export const STUDIO_AGENTS: StudioAgent[] = catalog.agents;

export const STUDIO_SKILLS: StudioSkill[] = catalog.skills.map((skill) => ({
  ...skill,
  category: normalizeCategory(skill.category),
}));

const HOOK_ACTION_OVERRIDES: Record<string, string> = {
  'log-instructions.sh':
    'Records every loaded instruction file and load reason (session_start, path_glob_match, include, compact) to production/session-logs/instructions-loaded.log.',
  'update-check.sh':
    'Checks at session start whether a newer Claude Code Game Studios release is available and prints a one-line notice.',
  'yaml-helper.sh':
    'Shared YAML parser and config resolution utility invoked by studio hooks and skill orchestrators to read project.yaml.',
};

export const STUDIO_HOOKS: StudioHook[] = catalog.hooks.map((hook) => ({
  ...hook,
  action: HOOK_ACTION_OVERRIDES[hook.file] || hook.action,
}));
export const STUDIO_RULES: StudioRule[] = catalog.rules;
export const STUDIO_ENGINES: EngineSpec[] = catalog.engines;

export const AGENT_BY_ID: Record<string, StudioAgent> = Object.fromEntries(
  STUDIO_AGENTS.map((agent) => [agent.id, agent]),
);

export const SKILL_BY_ID: Record<string, StudioSkill> = Object.fromEntries(
  STUDIO_SKILLS.map((skill) => [skill.id, skill]),
);

export const SKILL_CATEGORIES: string[] = Array.from(
  new Set(STUDIO_SKILLS.map((s) => s.category)),
).sort();

export const AGENT_DEPARTMENTS: string[] = [
  'Executive Leadership',
  'Game & UX Design',
  'Engineering',
  'Art & Visuals',
  'Audio',
  'Narrative',
  'Quality & Accessibility',
  'Production & Publishing',
];

export const GENRE_PRESETS: string[] = [
  'Cozy Arcade / Fishing',
  'Top-Down Action Roguelike',
  'Turn-Based Tactical Deckbuilder',
  '2D Precision Platformer',
  'Isometric Colony Builder',
  'First-Person Narrative Mystery',
  'Arcade Space Shooter',
  'Physics Puzzle Adventure',
];
