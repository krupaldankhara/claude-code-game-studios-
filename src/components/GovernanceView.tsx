import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, Search } from 'lucide-react';
import { STUDIO_HOOKS, STUDIO_RULES } from '../data/studioCatalog';
import { evaluateGuardrails } from '../utils/guardrails';

const SIMULATOR_PRESETS: Array<{
  label: string;
  actionType: 'bash' | 'write' | 'read';
  target: string;
}> = [
  { label: 'Push to main', actionType: 'bash', target: 'git push origin main' },
  { label: 'Commit changes', actionType: 'bash', target: 'git commit -m "add fishing bite table"' },
  { label: 'Edit Entity Registry', actionType: 'write', target: 'design/registry/entities.yaml' },
  { label: 'Overwrite project.godot', actionType: 'write', target: 'project.godot' },
  { label: 'Read Gameplay Code', actionType: 'read', target: 'src/gameplay/fishing_rod.gd' },
  { label: 'Read Shader File', actionType: 'read', target: 'assets/shaders/dusk_water.gdshader' },
  { label: 'Read Prototype File', actionType: 'read', target: 'prototypes/duskwater/index.html' },
];

export function GovernanceView() {
  const [actionType, setActionType] = useState<'bash' | 'write' | 'read'>('bash');
  const [targetInput, setTargetInput] = useState('git push origin main');
  const [referenceTab, setReferenceTab] = useState<'hooks' | 'rules'>('hooks');
  const [search, setSearch] = useState('');

  const evaluation = useMemo(
    () => evaluateGuardrails(actionType, targetInput),
    [actionType, targetInput],
  );

  const filteredHooks = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return STUDIO_HOOKS;
    return STUDIO_HOOKS.filter(
      (h) =>
        h.file.toLowerCase().includes(q) ||
        h.event.toLowerCase().includes(q) ||
        h.action.toLowerCase().includes(q),
    );
  }, [search]);

  const filteredRules = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return STUDIO_RULES;
    return STUDIO_RULES.filter(
      (r) =>
        r.file.toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q) ||
        r.paths.some((p) => p.toLowerCase().includes(q)),
    );
  }, [search]);

  return (
    <div className="max-w-[1320px] mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Interactive Guardrail Simulator */}
      <section
        aria-label="Guardrail simulator"
        className="bg-[#12161F] border border-[#222836] rounded-xl p-5 space-y-5"
      >
        <div className="space-y-3">
          <div>
            <h2 className="font-display text-lg font-semibold text-[#F3F6FC]">
              Guardrail & Rule Simulator
            </h2>
            <p className="text-sm text-[#9BA5B8]">
              Try a preset below or enter any command or file path to see how the studio protects your project automatically.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-xs">
            <div className="p-3 rounded-lg bg-[#0E121A] border border-[#1E2534] space-y-1">
              <div className="font-semibold text-[#F3F6FC]">
                Hooks (18 automatic safety checks)
              </div>
              <p className="text-[#9BA5B8] leading-relaxed">
                Run before commits, pushes, or file edits to catch risky actions — like pushing directly to main or overwriting project settings.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-[#0E121A] border border-[#1E2534] space-y-1">
              <div className="font-semibold text-[#F3F6FC]">
                Path-Scoped Rules (14 coding checklists)
              </div>
              <p className="text-[#9BA5B8] leading-relaxed">
                Automatically load into agent context when reading matching files (for example, opening a shader loads shader quality rules).
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-3">
            <label htmlFor="sim-action-type" className="block text-xs text-[#8E99AD] mb-1.5">
              Tool Operation
            </label>
            <select
              id="sim-action-type"
              value={actionType}
              onChange={(e) =>
                setActionType(e.target.value as 'bash' | 'write' | 'read')
              }
              className="w-full h-10 px-3 rounded-lg bg-[#0B0E14] border border-[#262E40] text-sm text-[#E6EAF2] focus:outline-none focus:border-[#E5A00D]"
            >
              <option value="bash">Bash Command</option>
              <option value="write">Write / Edit File</option>
              <option value="read">Read File</option>
            </select>
          </div>

          <div className="md:col-span-9">
            <label htmlFor="sim-target-input" className="block text-xs text-[#8E99AD] mb-1.5">
              Command or Relative File Path
            </label>
            <input
              id="sim-target-input"
              type="text"
              value={targetInput}
              onChange={(e) => setTargetInput(e.target.value)}
              placeholder="e.g. git push origin main or src/gameplay/player.gd"
              className="w-full h-10 px-3.5 rounded-lg bg-[#0B0E14] border border-[#262E40] text-sm font-mono text-[#F3F6FC] placeholder:text-[#5E6A82] focus:outline-none focus:border-[#E5A00D]"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {SIMULATOR_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => {
                setActionType(preset.actionType);
                setTargetInput(preset.target);
              }}
              className="px-2.5 py-1 rounded-md text-xs text-[#9BA5B8] hover:text-[#F3F6FC] bg-[#181D29] hover:bg-[#202738] border border-[#252C3C] transition-colors whitespace-nowrap"
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Evaluation Output */}
        <div
          data-testid="guardrail-results"
          className="p-4 rounded-lg bg-[#0B0E14] border border-[#1E2534] space-y-4"
        >
          <div className="text-xs font-medium text-[#CBD4E3]">
            {evaluation.summary}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="text-xs font-medium text-[#8E99AD]">
                Triggered Hooks ({evaluation.triggeredHooks.length})
              </div>
              {evaluation.triggeredHooks.length === 0 ? (
                <div className="p-3 rounded-lg bg-[#12161F] border border-[#1E2432] text-xs text-[#7C879C] flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#22C55E] shrink-0" />
                  <span>No PreToolUse validation hooks block or warn on this operation.</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {evaluation.triggeredHooks.map((match) => (
                    <div
                      key={match.hook.file}
                      className="p-3 rounded-lg bg-[#12161F] border border-[#222836] space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-medium text-[#F3F6FC]">
                          {match.hook.file}
                        </span>
                        <span
                          className={`text-xs font-medium inline-flex items-center gap-1 ${
                            match.outcome === 'blocked'
                              ? 'text-[#EF4444]'
                              : match.outcome === 'warning'
                                ? 'text-[#F59E0B]'
                                : 'text-[#9BA5B8]'
                          }`}
                        >
                          {match.outcome === 'blocked' ? (
                            <AlertTriangle className="w-3.5 h-3.5" />
                          ) : (
                            <Info className="w-3.5 h-3.5" />
                          )}
                          <span className="capitalize">{match.outcome}</span>
                        </span>
                      </div>
                      <p className="text-xs text-[#9BA5B8] leading-relaxed">
                        {match.reason}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="text-xs font-medium text-[#8E99AD]">
                Loaded Path-Scoped Rules ({evaluation.loadedRules.length})
              </div>
              {evaluation.loadedRules.length === 0 ? (
                <div className="p-3 rounded-lg bg-[#12161F] border border-[#1E2432] text-xs text-[#7C879C]">
                  {actionType === 'read'
                    ? 'No path-scoped rules matched this file path.'
                    : 'Switch operation to "Read File" to see which .claude/rules/ files load when opening a matching path.'}
                </div>
              ) : (
                <div className="space-y-2">
                  {evaluation.loadedRules.map((match) => (
                    <div
                      key={match.rule.id}
                      className="p-3 rounded-lg bg-[#12161F] border border-[#222836] space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-medium text-[#E5A00D]">
                          .claude/rules/{match.rule.file}
                        </span>
                        <span className="font-mono text-[11px] text-[#7C879C] truncate">
                          {match.matchedGlob}
                        </span>
                      </div>
                      <div className="text-xs text-[#CBD4E3]">
                        {match.rule.title}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Reference Tables for Hooks & Rules */}
      <section className="bg-[#12161F] border border-[#222836] rounded-xl overflow-hidden">
        <div className="p-4 border-b border-[#222836] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div
            role="tablist"
            aria-label="Governance catalogs"
            className="inline-flex items-center gap-1 p-1 rounded-lg bg-[#0B0E14] border border-[#222836] self-start"
          >
            <button
              type="button"
              role="tab"
              aria-selected={referenceTab === 'hooks'}
              onClick={() => setReferenceTab('hooks')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                referenceTab === 'hooks'
                  ? 'bg-[#1F2636] text-[#F8FAFC]'
                  : 'text-[#8E99AD] hover:text-[#E6EAF2]'
              }`}
            >
              Active Hooks ({STUDIO_HOOKS.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={referenceTab === 'rules'}
              onClick={() => setReferenceTab('rules')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                referenceTab === 'rules'
                  ? 'bg-[#1F2636] text-[#F8FAFC]'
                  : 'text-[#8E99AD] hover:text-[#E6EAF2]'
              }`}
            >
              Path-Scoped Rules ({STUDIO_RULES.length})
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <label htmlFor="governance-search" className="sr-only">
              Filter hooks and rules
            </label>
            <Search className="w-4 h-4 text-[#6E7A91] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="governance-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Filter ${referenceTab}...`}
              className="w-full h-9 pl-9 pr-3 rounded-lg bg-[#0B0E14] border border-[#262E40] text-xs text-[#F3F6FC] placeholder:text-[#5E6A82] focus:outline-none focus:border-[#E5A00D]"
            />
          </div>
        </div>

        {referenceTab === 'hooks' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#222836] text-xs font-medium text-[#7C879C]">
                  <th className="py-3 px-4">Script</th>
                  <th className="py-3 px-4">Event</th>
                  <th className="py-3 px-4">Mode</th>
                  <th className="py-3 px-4">Enforcement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1C2230] text-sm">
                {filteredHooks.map((hook) => (
                  <tr key={hook.file} className="hover:bg-[#161B26]">
                    <td className="py-3 px-4 font-mono text-xs text-[#E5A00D] whitespace-nowrap">
                      {hook.file}
                    </td>
                    <td className="py-3 px-4 text-xs text-[#CBD4E3] whitespace-nowrap">
                      {hook.event}
                    </td>
                    <td className="py-3 px-4 text-xs whitespace-nowrap">
                      <span
                        className={
                          hook.severity === 'blocking'
                            ? 'text-[#EF4444]'
                            : hook.severity === 'warning'
                              ? 'text-[#F59E0B]'
                              : 'text-[#8E99AD]'
                        }
                      >
                        {hook.severity === 'blocking'
                          ? 'Blocking gate'
                          : hook.severity === 'warning'
                            ? 'Advisory warn'
                            : 'Lifecycle'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-[#9BA5B8] leading-relaxed max-w-xl">
                      {hook.action}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="divide-y divide-[#1C2230]">
            {filteredRules.map((rule) => (
              <div key={rule.id} className="p-4 space-y-2 hover:bg-[#151A24]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="font-mono text-xs text-[#E5A00D]">
                      .claude/rules/{rule.file}
                    </span>
                    <h3 className="text-sm font-medium text-[#F3F6FC] mt-0.5">
                      {rule.title}
                    </h3>
                  </div>
                  <span className="text-xs text-[#7C879C]">{rule.scope}</span>
                </div>

                {rule.paths.length > 0 && (
                  <div className="font-mono text-xs text-[#8E99AD] bg-[#0B0E14] border border-[#1E2534] rounded px-3 py-2 overflow-x-auto">
                    paths: {rule.paths.join(' · ')}
                  </div>
                )}

                {rule.highlights.length > 0 && (
                  <ul className="space-y-1 text-xs text-[#A9B3C5] list-disc pl-5">
                    {rule.highlights.slice(0, 3).map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
