import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  CircleDashed,
  Copy,
  Download,
  HelpCircle,
  Loader2,
  Maximize2,
  Minimize2,
  RefreshCw,
  Send,
  X,
} from 'lucide-react';
import { AGENT_BY_ID, STUDIO_SKILLS } from '../data/studioCatalog';
import { parseStudioInput, resolveDelegationChain } from '../utils/studioRouter';
import { MarkdownViewer } from './MarkdownViewer';
import type { ProjectConfig, StudioSessionTurn } from '../types/studio';

interface StudioCommandViewProps {
  config: ProjectConfig;
  turns: StudioSessionTurn[];
  selectedTurnId: string;
  onSelectTurn: (id: string) => void;
  commandDraft: string;
  onChangeDraft: (val: string) => void;
  pinnedAgentId: string | null;
  onClearPinnedAgent: () => void;
  isExecuting: boolean;
  executionError: string | null;
  onDismissError: () => void;
  onExecuteCommand: (rawInput: string) => void;
  onInspectAgent: (agentId: string) => void;
  onOpenArtifacts: () => void;
}

interface GoalMode {
  id: string;
  label: string;
  command: string;
  placeholder: string;
  examples: Array<{ label: string; prompt: string }>;
}

const GOAL_MODES: GoalMode[] = [
  {
    id: 'prototype',
    label: 'Build Playable Game',
    command: '/prototype',
    placeholder:
      'Describe your game idea in plain English (e.g. a cozy fishing game where rare fish only bite at dusk)',
    examples: [
      {
        label: 'Dusk Fishing Game',
        prompt: 'a fishing game where the rare fish only bite at dusk',
      },
      {
        label: 'Zero-G Asteroid Courier',
        prompt:
          'a top-down zero-gravity courier game delivering fragile cargo through rotating asteroid rings',
      },
      {
        label: 'Cozy Tea Shop Rhythm',
        prompt: 'a relaxing rhythm game where you brew tea to the beat of rain on a roof',
      },
    ],
  },
  {
    id: 'design',
    label: 'Design a Mechanic',
    command: '/design-system',
    placeholder:
      'Describe a game mechanic to design (e.g. a parry and stamina loop for boss encounters)',
    examples: [
      {
        label: 'Parry & Stamina Loop',
        prompt: 'parry and stamina loop for tense boss encounters',
      },
      {
        label: 'Dynamic Weather & Fishing',
        prompt: 'weather shifts that unlock rare nocturnal fish species',
      },
    ],
  },
  {
    id: 'sprint',
    label: 'Plan a Sprint',
    command: '/sprint-plan',
    placeholder:
      'Describe your milestone goal (e.g. turn our prototype into a polished vertical slice in 2 weeks)',
    examples: [
      {
        label: 'Vertical Slice Milestone',
        prompt: 'grow Duskwater Angler into a full vertical slice with QA checks',
      },
      {
        label: 'Playtest Launch Sprint',
        prompt: 'prepare a public itch.io playtest build with bug triage',
      },
    ],
  },
  {
    id: 'art',
    label: 'Art Style Guide',
    command: '/art-bible',
    placeholder:
      'Describe the visual mood (e.g. twilight lakeside palette with warm amber lanterns and deep pine silhouettes)',
    examples: [
      {
        label: 'Twilight Lakeside Palette',
        prompt: 'twilight lakeside color palette, dock silhouettes, and water shimmer rules',
      },
      {
        label: 'Crisp Pixel Dungeon',
        prompt: 'high-contrast 16-bit dungeon palette with clear enemy readability',
      },
    ],
  },
  {
    id: 'balance',
    label: 'Balance & Review',
    command: '/balance-check',
    placeholder:
      'What should the studio audit? (e.g. rare fish catch rates and reeling tension curve)',
    examples: [
      {
        label: 'Dusk Catch Rates',
        prompt: 'dusk lanternfish catch rate and tension sweet-spot difficulty curve',
      },
      {
        label: 'Save-State Architecture',
        prompt: '/architecture-decision deterministic save state and replay serialization',
      },
    ],
  },
];

const GUIDE_STORAGE_KEY = 'ccgs_hide_quick_guide_v1';

export function StudioCommandView({
  config,
  turns,
  selectedTurnId,
  onSelectTurn,
  commandDraft,
  onChangeDraft,
  pinnedAgentId,
  onClearPinnedAgent,
  isExecuting,
  executionError,
  onDismissError,
  onExecuteCommand,
  onInspectAgent,
  onOpenArtifacts,
}: StudioCommandViewProps) {
  const [selectedGoalId, setSelectedGoalId] = useState<string>('prototype');
  const [canvasTab, setCanvasTab] = useState<'preview' | 'document' | 'team'>(
    'preview',
  );
  const [rawMarkdown, setRawMarkdown] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const [expandedPreview, setExpandedPreview] = useState(false);
  const [copiedSource, setCopiedSource] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showGuide, setShowGuide] = useState<boolean>(() => {
    try {
      return localStorage.getItem(GUIDE_STORAGE_KEY) !== '1';
    } catch {
      return true;
    }
  });
  const [justSavedTitle, setJustSavedTitle] = useState<string | null>(null);
  const prevTurnCountRef = useRef(turns.length);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeTurn =
    turns.find((t) => t.id === selectedTurnId) || turns[0] || null;

  const activeGoal =
    GOAL_MODES.find((g) => g.id === selectedGoalId) || GOAL_MODES[0];

  // Auto-select the best tab when a newly generated turn finishes
  useEffect(() => {
    if (turns.length > prevTurnCountRef.current && turns[0]) {
      const newest = turns[0];
      setCanvasTab(newest.playableHtml ? 'preview' : 'document');
      setRawMarkdown(false);
      setJustSavedTitle(newest.title);
      const timer = setTimeout(() => setJustSavedTitle(null), 6000);
      prevTurnCountRef.current = turns.length;
      return () => clearTimeout(timer);
    }
    prevTurnCountRef.current = turns.length;
  }, [turns]);

  const effectiveCommandString = useMemo(() => {
    const trimmed = commandDraft.trim();
    if (!trimmed) return activeGoal.command;
    if (trimmed.startsWith('/')) return trimmed;
    return `${activeGoal.command} ${trimmed}`;
  }, [commandDraft, activeGoal.command]);

  const parsedDraft = useMemo(
    () => parseStudioInput(effectiveCommandString),
    [effectiveCommandString],
  );

  const previewDelegation = useMemo(
    () =>
      resolveDelegationChain(
        parsedDraft.command,
        config.engine,
        config.workflowMode,
        pinnedAgentId || undefined,
      ),
    [parsedDraft.command, config.engine, config.workflowMode, pinnedAgentId],
  );

  const slashSuggestions = useMemo(() => {
    const trimmed = commandDraft.trim();
    if (!trimmed.startsWith('/') || trimmed.includes(' ')) return [];
    const query = trimmed.slice(1).toLowerCase();
    return STUDIO_SKILLS.filter(
      (s) =>
        s.id.includes(query) ||
        s.summary.toLowerCase().includes(query),
    ).slice(0, 6);
  }, [commandDraft]);

  const pinnedAgent = pinnedAgentId ? AGENT_BY_ID[pinnedAgentId] : null;

  const toggleGuide = (visible: boolean) => {
    setShowGuide(visible);
    try {
      localStorage.setItem(GUIDE_STORAGE_KEY, visible ? '0' : '1');
    } catch {
      // Ignore storage restrictions
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commandDraft.trim() || isExecuting) return;
    setShowSuggestions(false);
    onExecuteCommand(effectiveCommandString);
  };

  const handleCopyArtifact = async () => {
    if (!activeTurn) return;
    try {
      await navigator.clipboard.writeText(activeTurn.artifactContent);
      setCopiedSource(true);
      setTimeout(() => setCopiedSource(false), 1800);
    } catch {
      // Clipboard blocked in headless mode
    }
  };

  const handleDownloadArtifact = () => {
    if (!activeTurn) return;
    const filename = activeTurn.artifactPath.split('/').pop() || 'deliverable.md';
    const blob = new Blob([activeTurn.artifactContent], {
      type: 'text/markdown;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const effectiveTab =
    canvasTab === 'preview' && !activeTurn?.playableHtml
      ? 'document'
      : canvasTab;

  return (
    <div className="max-w-[1320px] mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Friendly Onboarding Quick Guide */}
      {showGuide && (
        <section
          aria-label="Quick start guide"
          className="bg-[#12161F] border border-[#222836] rounded-xl p-5 space-y-3"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-base font-semibold text-[#F3F6FC]">
                Welcome to your virtual game studio
              </h2>
              <p className="text-sm text-[#9BA5B8] mt-0.5">
                No slash-command memorization required — pick what you want to create below and describe it in plain English.
              </p>
            </div>
            <button
              type="button"
              onClick={() => toggleGuide(false)}
              aria-label="Dismiss quick start guide"
              className="text-xs text-[#8E99AD] hover:text-[#F3F6FC] inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md hover:bg-[#1B2231] shrink-0"
            >
              <span>Hide guide</span>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-[#1D2330] text-sm">
            <div className="space-y-1">
              <div className="text-xs font-semibold text-[#E5A00D]">
                1. Pick a goal or describe your idea
              </div>
              <p className="text-xs text-[#9BA5B8] leading-relaxed">
                Choose Build Playable Game, Design a Mechanic, or Plan a Sprint, then type your idea or click an example.
              </p>
            </div>
            <div className="space-y-1">
              <div className="text-xs font-semibold text-[#E5A00D]">
                2. Your studio team collaborates
              </div>
              <p className="text-xs text-[#9BA5B8] leading-relaxed">
                Directors, Department Leads, and {config.engine} Specialists split the work and run QA checks automatically.
              </p>
            </div>
            <div className="space-y-1">
              <div className="text-xs font-semibold text-[#E5A00D]">
                3. Play, read, and download
              </div>
              <p className="text-xs text-[#9BA5B8] leading-relaxed">
                Play generated HTML5 prototypes right in the preview window, read clean formatted briefs, and export files anytime.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Guided Studio Composer */}
      <section
        aria-label="Create with your studio"
        className="bg-[#12161F] border border-[#222836] rounded-xl p-5 space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-lg font-semibold text-[#F3F6FC]">
              What would you like your studio to build?
            </h2>
            <p className="text-sm text-[#9BA5B8]">
              Write in plain English, or type <code className="text-[#CBD4E3]">/</code> to browse all 78 slash commands.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            {pinnedAgent && (
              <div className="flex items-center gap-2 text-xs text-[#E5A00D] bg-[#1C212E] border border-[#2E364A] px-3 py-1.5 rounded-lg">
                <span>Consulting: {pinnedAgent.name}</span>
                <button
                  type="button"
                  onClick={onClearPinnedAgent}
                  aria-label={`Clear pinned agent ${pinnedAgent.name}`}
                  className="text-[#9BA5B8] hover:text-[#F3F6FC]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            {!showGuide && (
              <button
                type="button"
                onClick={() => toggleGuide(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-[#9BA5B8] hover:text-[#F3F6FC] bg-[#181D29] border border-[#252C3C] whitespace-nowrap"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Show Guide</span>
              </button>
            )}
          </div>
        </div>

        {/* Plain-English Goal Mode Selector */}
        <div
          role="tablist"
          aria-label="Choose a studio task"
          className="flex items-center gap-1.5 flex-wrap"
        >
          {GOAL_MODES.map((goal) => {
            const isSelected =
              !commandDraft.trim().startsWith('/') && selectedGoalId === goal.id;
            return (
              <button
                key={goal.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => {
                  setSelectedGoalId(goal.id);
                  if (commandDraft.trim().startsWith('/')) {
                    onChangeDraft('');
                  }
                  inputRef.current?.focus();
                }}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  isSelected
                    ? 'bg-[#1F2636] text-[#F8FAFC] border border-[#E5A00D]/50'
                    : 'bg-[#0E121A] text-[#9BA5B8] hover:text-[#E6EAF2] border border-[#222836]'
                }`}
              >
                {goal.label}
              </button>
            );
          })}
        </div>

        <form onSubmit={handleSubmit} className="relative">
          <label htmlFor="studio-command-input" className="sr-only">
            Describe what you want to build or type a slash command
          </label>
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <input
                ref={inputRef}
                id="studio-command-input"
                type="text"
                value={commandDraft}
                onChange={(e) => {
                  onChangeDraft(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 180)}
                placeholder={activeGoal.placeholder}
                className="w-full h-11 px-4 rounded-lg bg-[#0B0E14] border border-[#2A3244] text-sm text-[#F3F6FC] placeholder:text-[#66738B] focus:outline-none focus:border-[#E5A00D]"
              />

              {showSuggestions && slashSuggestions.length > 0 && (
                <div
                  role="listbox"
                  aria-label="Slash command suggestions"
                  className="absolute left-0 right-0 top-12 z-20 bg-[#151A25] border border-[#2A3244] rounded-lg shadow-xl overflow-hidden"
                >
                  {slashSuggestions.map((skill) => (
                    <button
                      key={skill.id}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        onChangeDraft(`${skill.command} `);
                        setShowSuggestions(false);
                        inputRef.current?.focus();
                      }}
                      className="w-full px-3.5 py-2.5 text-left hover:bg-[#1D2433] flex items-baseline justify-between gap-4 border-b border-[#222836] last:border-b-0"
                    >
                      <span className="font-mono text-xs text-[#E5A00D] shrink-0">
                        {skill.command}
                      </span>
                      <span className="text-xs text-[#9BA5B8] truncate">
                        {skill.summary}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isExecuting || !commandDraft.trim()}
              className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-lg bg-[#E5A00D] hover:bg-[#F0B429] disabled:opacity-50 disabled:cursor-not-allowed text-[#0B0E14] text-sm font-semibold transition-colors whitespace-nowrap shrink-0"
            >
              {isExecuting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span>{isExecuting ? 'Working...' : 'Ask Studio'}</span>
            </button>
          </div>
        </form>

        {/* Contextual Examples & Live Team Preview */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-2 border-t border-[#1D2330]">
          <div className="flex items-center gap-2 text-xs text-[#8E99AD] flex-wrap">
            <span className="font-medium text-[#C5CDDC]">Try an example:</span>
            {activeGoal.examples.map((ex) => (
              <button
                key={ex.label}
                type="button"
                onClick={() => {
                  onChangeDraft(ex.prompt);
                  inputRef.current?.focus();
                }}
                className="px-2.5 py-1 rounded-md text-xs text-[#CBD4E3] hover:text-[#F8FAFC] bg-[#181D29] hover:bg-[#22293B] border border-[#252C3C] transition-colors whitespace-nowrap"
              >
                {ex.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 text-xs text-[#8E99AD] flex-wrap">
            <span className="text-[#7C879C]">Assigned team:</span>
            {previewDelegation.map((step, idx) => (
              <span key={step.agentId} className="inline-flex items-center gap-1.5">
                {idx > 0 && <ArrowRight className="w-3 h-3 text-[#525E75]" />}
                <button
                  type="button"
                  onClick={() => onInspectAgent(step.agentId)}
                  className="text-[#CBD4E3] hover:text-[#E5A00D] underline-offset-2 hover:underline transition-colors"
                >
                  {step.agentName}
                </button>
              </span>
            ))}
          </div>
        </div>

        {justSavedTitle && !isExecuting && (
          <div
            role="status"
            className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 rounded-lg bg-[#102218] border border-[#1E462E] text-xs text-[#86EFAC]"
          >
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#22C55E] shrink-0" />
              <span>Completed "{justSavedTitle}" and saved to your project artifacts.</span>
            </span>
            <button
              type="button"
              onClick={onOpenArtifacts}
              className="font-medium text-[#F3F6FC] hover:text-[#E5A00D] underline underline-offset-2 whitespace-nowrap"
            >
              View Saved Artifacts
            </button>
          </div>
        )}

        {executionError && (
          <div
            role="alert"
            className="flex items-start justify-between gap-3 p-3.5 rounded-lg bg-[#2A1519] border border-[#7F1D1D] text-sm text-[#FCA5A5]"
          >
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-[#EF4444]" />
              <span>{executionError}</span>
            </div>
            <button
              type="button"
              onClick={onDismissError}
              aria-label="Dismiss error message"
              className="text-[#FCA5A5] hover:text-white shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </section>

      {/* Main Split: Session History + Active Studio Deliverable */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Session History Column */}
        <section
          aria-label="Studio session history"
          className="xl:col-span-4 bg-[#12161F] border border-[#222836] rounded-xl overflow-hidden"
        >
          <div className="px-4 py-3.5 border-b border-[#222836] flex items-center justify-between">
            <h3 className="font-display text-sm font-semibold text-[#F3F6FC]">
              Recent Sessions
            </h3>
            <span className="font-mono text-xs tabular-nums text-[#7C879C]">
              {turns.length} {turns.length === 1 ? 'run' : 'runs'}
            </span>
          </div>

          <div className="divide-y divide-[#1D2330] max-h-[620px] overflow-y-auto">
            {isExecuting && (
              <div className="p-4 space-y-2 bg-[#161B26]">
                <div className="flex items-center gap-2 text-xs text-[#E5A00D] font-medium">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Running {parsedDraft.command}...</span>
                </div>
                <div className="text-xs text-[#9BA5B8] line-clamp-2">
                  {commandDraft.trim() || effectiveCommandString}
                </div>
              </div>
            )}

            {turns.map((turn) => {
              const selected = activeTurn?.id === turn.id;
              return (
                <button
                  key={turn.id}
                  type="button"
                  onClick={() => {
                    onSelectTurn(turn.id);
                    setCanvasTab(turn.playableHtml ? 'preview' : 'document');
                  }}
                  className={`w-full text-left p-4 transition-colors ${
                    selected ? 'bg-[#191F2D]' : 'hover:bg-[#151A24]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-xs text-[#8E99AD] mb-1">
                    <span className="font-mono text-[#E5A00D]">{turn.command}</span>
                    <span className="font-mono tabular-nums truncate">
                      {turn.artifactPath}
                    </span>
                  </div>
                  <div className="text-sm font-medium text-[#F3F6FC] line-clamp-1">
                    {turn.title}
                  </div>
                  <p className="text-xs text-[#8E99AD] mt-1 line-clamp-2">
                    {turn.summary}
                  </p>
                  <div className="mt-2 text-xs text-[#6E7A91] flex items-center gap-1.5">
                    <span className="tabular-nums">
                      {turn.delegation.length} team members
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {turn.playableHtml
                        ? 'Playable game included'
                        : turn.artifactKind.toUpperCase()}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Active Deliverable Canvas */}
        <section
          aria-label="Active studio deliverable"
          className="xl:col-span-8 bg-[#12161F] border border-[#222836] rounded-xl overflow-hidden"
        >
          {isExecuting ? (
            <div className="p-6 space-y-5">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-[#E5A00D] animate-spin shrink-0" />
                <div>
                  <h3 className="font-display text-base font-semibold text-[#F3F6FC]">
                    Your studio team is collaborating on this request
                  </h3>
                  <p className="text-xs text-[#9BA5B8] mt-0.5">
                    Command: <code className="text-[#CBD4E3]">{effectiveCommandString}</code>
                  </p>
                </div>
              </div>

              <div className="divide-y divide-[#1D2330] border border-[#222836] rounded-lg overflow-hidden">
                {previewDelegation.map((step) => (
                  <div
                    key={step.agentId}
                    className="p-4 bg-[#10141C] flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="text-sm font-medium text-[#F3F6FC]">
                        {step.agentName}
                      </div>
                      <div className="text-xs text-[#8E99AD] mt-0.5">
                        {step.roleInRun}
                      </div>
                    </div>
                    <span className="text-xs font-mono text-[#E5A00D] shrink-0">
                      Tier {step.tier}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : activeTurn ? (
            <>
              <div className="px-5 py-4 border-b border-[#222836] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs text-[#8E99AD] mb-1">
                    <span className="font-mono text-[#E5A00D]">
                      {activeTurn.command}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono truncate">
                      {activeTurn.artifactPath}
                    </span>
                  </div>
                  <h3 className="font-display text-base font-semibold text-[#F3F6FC] truncate">
                    {activeTurn.title}
                  </h3>
                </div>

                {/* Friendly 3-Tab View Switch */}
                <div
                  role="tablist"
                  aria-label="Deliverable views"
                  className="inline-flex w-full sm:w-auto items-center gap-1 p-1 rounded-lg bg-[#0B0E14] border border-[#222836] shrink-0 overflow-x-auto"
                >
                  {activeTurn.playableHtml && (
                    <button
                      type="button"
                      role="tab"
                      aria-selected={effectiveTab === 'preview'}
                      onClick={() => setCanvasTab('preview')}
                      className={`flex-1 sm:flex-none px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                        effectiveTab === 'preview'
                          ? 'bg-[#1F2636] text-[#F8FAFC]'
                          : 'text-[#8E99AD] hover:text-[#E6EAF2]'
                      }`}
                    >
                      Playable Game
                    </button>
                  )}
                  <button
                    type="button"
                    role="tab"
                    aria-selected={effectiveTab === 'document'}
                    onClick={() => setCanvasTab('document')}
                    className={`flex-1 sm:flex-none px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                      effectiveTab === 'document'
                        ? 'bg-[#1F2636] text-[#F8FAFC]'
                        : 'text-[#8E99AD] hover:text-[#E6EAF2]'
                    }`}
                  >
                    Read Document
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={effectiveTab === 'team'}
                    onClick={() => setCanvasTab('team')}
                    className={`flex-1 sm:flex-none px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                      effectiveTab === 'team'
                        ? 'bg-[#1F2636] text-[#F8FAFC]'
                        : 'text-[#8E99AD] hover:text-[#E6EAF2]'
                    }`}
                  >
                    Team & QA
                  </button>
                </div>
              </div>

              {/* Tab 1: Playable HTML5 Canvas Preview */}
              {effectiveTab === 'preview' && activeTurn.playableHtml && (
                <div className="p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-[#9BA5B8]">
                      Click inside the game window or press Space to play. Use Reload to restart from the beginning.
                    </p>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setPreviewKey((k) => k + 1)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-[#CBD4E3] bg-[#181D29] hover:bg-[#22293A] border border-[#283044] whitespace-nowrap"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Reload</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setExpandedPreview((v) => !v)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-[#CBD4E3] bg-[#181D29] hover:bg-[#22293A] border border-[#283044] whitespace-nowrap"
                      >
                        {expandedPreview ? (
                          <>
                            <Minimize2 className="w-3.5 h-3.5" />
                            <span>Compact</span>
                          </>
                        ) : (
                          <>
                            <Maximize2 className="w-3.5 h-3.5" />
                            <span>Expand</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div
                    data-testid="prototype-preview-frame"
                    className={`w-full rounded-lg overflow-hidden border border-[#262E40] bg-[#070A10] transition-all ${
                      expandedPreview ? 'h-[620px]' : 'h-[430px]'
                    }`}
                  >
                    <iframe
                      key={`${activeTurn.id}-${previewKey}`}
                      title={`Playable preview for ${activeTurn.title}`}
                      srcDoc={activeTurn.playableHtml}
                      sandbox="allow-scripts"
                      className="w-full h-full border-0"
                    />
                  </div>

                  {activeTurn.recommendedNextCommands.length > 0 && (
                    <div className="pt-2 border-t border-[#1D2330] space-y-2">
                      <div className="text-xs font-medium text-[#8E99AD]">
                        Suggested Next Steps
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {activeTurn.recommendedNextCommands.map((cmd) => (
                          <button
                            key={cmd}
                            type="button"
                            onClick={() => {
                              onChangeDraft(cmd);
                              inputRef.current?.focus();
                            }}
                            className="px-3 py-1.5 rounded-md text-xs font-mono text-[#CBD4E3] hover:text-[#E5A00D] bg-[#161B26] hover:bg-[#1D2434] border border-[#252C3C] transition-colors text-left"
                          >
                            {cmd}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Formatted Document Reader (with Raw Markdown toggle & Download) */}
              {effectiveTab === 'document' && (
                <div className="p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#1D2330]">
                    <div className="inline-flex items-center gap-1 p-0.5 rounded-md bg-[#0B0E14] border border-[#222836]">
                      <button
                        type="button"
                        onClick={() => setRawMarkdown(false)}
                        className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                          !rawMarkdown
                            ? 'bg-[#1F2636] text-[#F8FAFC]'
                            : 'text-[#8E99AD] hover:text-[#E6EAF2]'
                        }`}
                      >
                        Formatted
                      </button>
                      <button
                        type="button"
                        onClick={() => setRawMarkdown(true)}
                        className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                          rawMarkdown
                            ? 'bg-[#1F2636] text-[#F8FAFC]'
                            : 'text-[#8E99AD] hover:text-[#E6EAF2]'
                        }`}
                      >
                        Raw Markdown
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCopyArtifact}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-[#CBD4E3] bg-[#181D29] hover:bg-[#22293A] border border-[#283044] whitespace-nowrap"
                      >
                        {copiedSource ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-[#22C55E]" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={handleDownloadArtifact}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-[#CBD4E3] bg-[#181D29] hover:bg-[#22293A] border border-[#283044] whitespace-nowrap"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </button>
                    </div>
                  </div>

                  {rawMarkdown ? (
                    <pre className="p-4 rounded-lg bg-[#0B0E14] border border-[#1F2534] text-xs font-mono text-[#D5DCEA] overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-[540px] overflow-y-auto">
                      {activeTurn.artifactContent}
                    </pre>
                  ) : (
                    <div
                      data-testid="formatted-document-view"
                      className="p-5 rounded-lg bg-[#0E121A] border border-[#1E2534] max-h-[540px] overflow-y-auto"
                    >
                      <MarkdownViewer content={activeTurn.artifactContent} />
                    </div>
                  )}

                  {activeTurn.recommendedNextCommands.length > 0 && (
                    <div className="pt-2 border-t border-[#1D2330] space-y-2">
                      <div className="text-xs font-medium text-[#8E99AD]">
                        Suggested Next Steps
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {activeTurn.recommendedNextCommands.map((cmd) => (
                          <button
                            key={cmd}
                            type="button"
                            onClick={() => {
                              onChangeDraft(cmd);
                              inputRef.current?.focus();
                            }}
                            className="px-3 py-1.5 rounded-md text-xs font-mono text-[#CBD4E3] hover:text-[#E5A00D] bg-[#161B26] hover:bg-[#1D2434] border border-[#252C3C] transition-colors text-left"
                          >
                            {cmd}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Team Contributions & QA Handover */}
              {effectiveTab === 'team' && (
                <div className="p-5 space-y-6">
                  <div className="space-y-1.5">
                    <div className="text-xs font-medium text-[#8E99AD]">
                      Summary
                    </div>
                    <p className="text-sm text-[#D8DFEC] leading-relaxed">
                      {activeTurn.summary}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="text-xs font-medium text-[#8E99AD]">
                      How Your Studio Team Split the Work
                    </div>
                    <div className="divide-y divide-[#1D2330] border border-[#222836] rounded-lg overflow-hidden">
                      {activeTurn.delegation.map((step) => (
                        <div
                          key={step.agentId}
                          className="p-4 bg-[#10141C] flex flex-col sm:flex-row sm:items-start justify-between gap-3"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-xs text-[#8E99AD]">
                              <button
                                type="button"
                                onClick={() => onInspectAgent(step.agentId)}
                                className="text-sm font-semibold text-[#F3F6FC] hover:text-[#E5A00D] transition-colors"
                              >
                                {step.agentName}
                              </button>
                              <span aria-hidden="true">·</span>
                              <span>Tier {step.tier} {step.tierLabel}</span>
                              <span aria-hidden="true">·</span>
                              <span>{step.department}</span>
                            </div>
                            <p className="text-sm text-[#B8C2D4] leading-relaxed">
                              {step.note || step.roleInRun}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {activeTurn.qaChecklist.length > 0 && (
                    <div className="space-y-3">
                      <div className="text-xs font-medium text-[#8E99AD]">
                        QA Verification Checklist
                      </div>
                      <ul className="space-y-2">
                        {activeTurn.qaChecklist.map((qc, idx) => (
                          <li
                            key={`${qc.item}-${idx}`}
                            className="flex items-start justify-between gap-3 px-3.5 py-2.5 rounded-lg bg-[#0E121A] border border-[#1E2432] text-sm"
                          >
                            <span className="flex items-start gap-2.5 text-[#D8DFEC]">
                              {qc.status === 'pass' ? (
                                <CheckCircle2 className="w-4 h-4 text-[#22C55E] shrink-0 mt-0.5" />
                              ) : (
                                <CircleDashed className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5" />
                              )}
                              <span>{qc.item}</span>
                            </span>
                            <span
                              className={`text-xs font-mono whitespace-nowrap shrink-0 ${
                                qc.status === 'pass'
                                  ? 'text-[#22C55E]'
                                  : 'text-[#F59E0B]'
                              }`}
                            >
                              {qc.status === 'pass'
                                ? 'Verified'
                                : qc.status === 'needs-human-play'
                                  ? 'Human playtest'
                                  : 'Pending check'}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="p-10 text-center space-y-3">
              <p className="text-sm text-[#9BA5B8]">
                No studio sessions yet. Pick a goal above and describe your game to get started.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
