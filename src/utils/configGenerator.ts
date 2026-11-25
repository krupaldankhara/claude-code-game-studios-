import { STUDIO_ENGINES } from '../data/studioCatalog';
import type { EngineId, EngineSpec, ProjectConfig } from '../types/studio';

export function slugifyProjectName(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'untitled-game';
}

export function getEngineSpec(engine: EngineId): EngineSpec {
  return (
    STUDIO_ENGINES.find((e) => e.engine === engine) ||
    STUDIO_ENGINES.find((e) => e.engine === 'Web')!
  );
}

export function generateProjectYaml(config: ProjectConfig): string {
  const spec = getEngineSpec(config.engine);
  const slug = slugifyProjectName(config.projectName);

  return [
    `# Claude Code Game Studios — Project Configuration`,
    `project:`,
    `  name: "${config.projectName.replace(/"/g, '\\"')}"`,
    `  slug: "${slug}"`,
    `  genre: "${config.genre.replace(/"/g, '\\"')}"`,
    `  stage: "prototype"`,
    ``,
    `engine:`,
    `  name: "${config.engine}"`,
    `  version: "${config.engineVersion}"`,
    `  code_root: "${spec.code_root}"`,
    `  test_root: "${spec.test_root}"`,
    `  asset_root: "${spec.asset_root}"`,
    ``,
    `modes:`,
    `  workflow: "${config.workflowMode}" # full | lean | solo`,
    `  automation: "${config.automationMode}" # guided | collaborative | autonomous`,
    ``,
    `director_gates:`,
    `  creative_review: ${config.directorGates.creativeReview}`,
    `  architecture_review: ${config.directorGates.architectureReview}`,
    `  qa_release_gate: ${config.directorGates.qaReleaseGate}`,
    ``,
    `commands:`,
    `  run: "${spec.run}"`,
    `  build: "${spec.build}"`,
    `  test: "${spec.test}"`,
    `  smoke: "${spec.smoke}"`,
    ``,
  ].join('\n');
}

export function generateClaudeLocalMd(config: ProjectConfig): string {
  const spec = getEngineSpec(config.engine);
  return [
    `# Local Studio Overrides — ${config.projectName}`,
    ``,
    `- **Engine**: ${config.engine} (${config.engineVersion})`,
    `- **Genre Focus**: ${config.genre}`,
    `- **Workflow Mode**: \`${config.workflowMode}\` (documentation depth required before code)`,
    `- **Automation Mode**: \`${config.automationMode}\` (prompting cadence)`,
    `- **Code Root**: \`${spec.code_root}/\``,
    `- **Test Root**: \`${spec.test_root}/\``,
    `- **Asset Root**: \`${spec.asset_root}/\``,
    ``,
    `## Active Director Gates`,
    `- Creative Director Review: ${config.directorGates.creativeReview ? 'Enabled' : 'Disabled'}`,
    `- Technical Director ADR Gate: ${config.directorGates.architectureReview ? 'Enabled' : 'Disabled'}`,
    `- QA Release Gate: ${config.directorGates.qaReleaseGate ? 'Enabled' : 'Disabled'}`,
    ``,
    `## Quick Start`,
    `\`\`\``,
    `/start`,
    `/prototype ${config.projectName} — ${config.genre}`,
    `\`\`\``,
    ``,
  ].join('\n');
}
