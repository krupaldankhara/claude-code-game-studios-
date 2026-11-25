import { STUDIO_HOOKS, STUDIO_RULES } from '../data/studioCatalog';
import type {
  GuardrailEvaluation,
  HookMatchResult,
  RuleMatchResult,
  StudioHook,
} from '../types/studio';

function expandBraces(pattern: string): string[] {
  const match = pattern.match(/\{([^{}]+)\}/);
  if (!match) return [pattern];
  const options = match[1].split(',');
  const results: string[] = [];
  for (const opt of options) {
    const replaced = pattern.replace(match[0], opt);
    results.push(...expandBraces(replaced));
  }
  return results;
}

function singleGlobToRegExp(glob: string): RegExp {
  let regexStr = '^';
  let i = 0;
  while (i < glob.length) {
    const ch = glob[i];
    if (ch === '*') {
      if (glob[i + 1] === '*') {
        if (glob[i + 2] === '/') {
          regexStr += '(?:.*/)?';
          i += 3;
        } else {
          regexStr += '.*';
          i += 2;
        }
      } else {
        regexStr += '[^/]*';
        i += 1;
      }
    } else if (ch === '?') {
      regexStr += '[^/]';
      i += 1;
    } else if ('\\^$+?.()|[]{}'.includes(ch)) {
      regexStr += '\\' + ch;
      i += 1;
    } else {
      regexStr += ch;
      i += 1;
    }
  }
  regexStr += '$';
  return new RegExp(regexStr, 'i');
}

export function matchGlob(filePath: string, pattern: string): boolean {
  const normalizedPath = filePath.replace(/\\/g, '/').replace(/^\.\//, '');
  const expanded = expandBraces(pattern.trim());
  return expanded.some((p) => singleGlobToRegExp(p).test(normalizedPath));
}

function findHook(file: string): StudioHook | undefined {
  return STUDIO_HOOKS.find((h) => h.file === file);
}

export function evaluateGuardrails(
  actionType: 'bash' | 'write' | 'read',
  rawTarget: string,
): GuardrailEvaluation {
  const target = rawTarget.trim();
  const triggeredHooks: HookMatchResult[] = [];
  const loadedRules: RuleMatchResult[] = [];

  if (!target) {
    return {
      actionType,
      target: '',
      triggeredHooks,
      loadedRules,
      summary: 'Enter a shell command or project file path to inspect active studio guardrails.',
    };
  }

  const pushHook = (
    file: string,
    outcome: 'blocked' | 'warning' | 'logged',
    reason: string,
  ) => {
    const hook = findHook(file);
    if (hook && !triggeredHooks.some((h) => h.hook.file === file)) {
      triggeredHooks.push({ hook, outcome, reason });
    }
  };

  if (actionType === 'bash') {
    if (/\bgit\s+commit\b/i.test(target)) {
      pushHook(
        'validate-commit.sh',
        'blocked',
        'Validates staged design doc structure, JSON syntax, hardcoded value rules, and TODO formatting before commit.',
      );
    }
    if (
      /\bgit\s+(push|tag|merge)\b/i.test(target) ||
      /\b(gh\s+release|butler\s+push|steamcmd)\b/i.test(target)
    ) {
      const protectedBranch = /\b(main|master|release\/)\b/i.test(target);
      pushHook(
        'validate-push.sh',
        protectedBranch ? 'blocked' : 'warning',
        protectedBranch
          ? 'Protected branch or release push detected (main/master/release/*). Requires explicit studio confirmation.'
          : 'Release or branch mutation command detected; prompts confirmation gate before execution.',
      );
    }
    if (/\b(claude|session)\b/i.test(target)) {
      pushHook(
        'session-start.sh',
        'logged',
        'Loads studio project.yaml configuration, checks tool prerequisites, and surfaces active stage.',
      );
      pushHook(
        'detect-gaps.sh',
        'warning',
        'Scans project state for missing GDD, ADR, or engine documentation gaps at session startup.',
      );
    }
  }

  if (actionType === 'write') {
    const norm = target.replace(/\\/g, '/').replace(/^\.\//, '');

    if (
      norm === 'design/registry/entities.yaml' ||
      norm === 'docs/architecture/tr-registry.yaml'
    ) {
      pushHook(
        'validate-registry.sh',
        'warning',
        'Compares registry diff before write to catch deleted or renumbered entity/TR IDs and invalid statuses.',
      );
    }

    if (
      /(^|\/)(EPIC\.md|project\.godot|tech-debt\.md)$/i.test(norm) ||
      /^tests\/helpers\//i.test(norm) ||
      /^project(\.local)?\.yaml$/i.test(norm)
    ) {
      pushHook(
        'validate-write.sh',
        'warning',
        'Protected scaffold or configuration file. Write-guard warns against destructive overwrites or invalid config keys.',
      );
    }

    if (/^prototypes\//i.test(norm)) {
      pushHook(
        'validate-write.sh',
        'warning',
        'Verifies prototype file carries a PROTOTYPE or VERTICAL SLICE header and does not import across code root boundaries.',
      );
    }

    if (/^\.claude\/(skills|agents)\//i.test(norm)) {
      pushHook(
        'validate-skill-change.sh',
        'warning',
        'Checks frontmatter integrity and skill authoring conventions when modifying studio definitions.',
      );
    }

    if (/^assets\//i.test(norm)) {
      pushHook(
        'validate-assets.sh',
        'warning',
        'Audits asset naming conventions, directory placement, and size budgets against studio standards.',
      );
    }

    if (/^(design|docs|production)\//i.test(norm)) {
      pushHook(
        'validate-agent-artifact.sh',
        'logged',
        'Verifies agent-produced artifacts include required studio metadata headers and target folders.',
      );
    }
  }

  if (actionType === 'read') {
    const norm = target.replace(/\\/g, '/').replace(/^\.\//, '');
    if (/(\.env|secrets|credentials|\.git\/)/i.test(norm)) {
      pushHook(
        'validate-read.sh',
        'blocked',
        'Read-guard flags sensitive or restricted paths before injecting file contents into agent context.',
      );
    }

    for (const rule of STUDIO_RULES) {
      if (rule.paths.length === 0) {
        loadedRules.push({ rule, matchedGlob: '(always loaded)' });
        continue;
      }
      const matchedGlob = rule.paths.find((glob) => matchGlob(norm, glob));
      if (matchedGlob) {
        loadedRules.push({ rule, matchedGlob });
      }
    }

    if (loadedRules.length > 0) {
      pushHook(
        'log-instructions.sh',
        'logged',
        `Records ${loadedRules.length} path-scoped rule file(s) loaded via path_glob_match into production/session-logs/instructions-loaded.log.`,
      );
    }
  }

  // Note: When editing a file that matches rules, inform user about read-before-edit behavior
  const summaryParts: string[] = [];
  if (triggeredHooks.length > 0) {
    summaryParts.push(
      `${triggeredHooks.length} hook${triggeredHooks.length === 1 ? '' : 's'} triggered`,
    );
  } else {
    summaryParts.push('No blocking or warning hooks triggered');
  }

  if (actionType === 'read') {
    summaryParts.push(
      `${loadedRules.length} path-scoped rule${loadedRules.length === 1 ? '' : 's'} loaded into context`,
    );
  } else if (actionType === 'write') {
    summaryParts.push(
      'Path-scoped rules only load on file Read (not brand-new Write)',
    );
  }

  return {
    actionType,
    target,
    triggeredHooks,
    loadedRules,
    summary: summaryParts.join(' · '),
  };
}
