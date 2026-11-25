import { useMemo, useState } from 'react';
import { ArrowUpRight, Search, X } from 'lucide-react';
import {
  AGENT_BY_ID,
  AGENT_DEPARTMENTS,
  STUDIO_AGENTS,
} from '../data/studioCatalog';
import { filterAgents } from '../utils/studioRouter';
import type { AgentEngineScope, StudioAgent } from '../types/studio';

interface AgentRosterViewProps {
  selectedAgentId: string | null;
  onSelectAgent: (id: string | null) => void;
  onConsultAgent: (agentId: string) => void;
}

const ENGINE_OPTIONS: Array<'all' | AgentEngineScope> = [
  'all',
  'Core',
  'Godot',
  'Unity',
  'Unreal',
];

export function AgentRosterView({
  selectedAgentId,
  onSelectAgent,
  onConsultAgent,
}: AgentRosterViewProps) {
  const [viewMode, setViewMode] = useState<'hierarchy' | 'table'>('hierarchy');
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<'all' | 1 | 2 | 3>('all');
  const [engineFilter, setEngineFilter] = useState<'all' | AgentEngineScope>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');

  const filtered = useMemo(
    () =>
      filterAgents(STUDIO_AGENTS, {
        search,
        tier: tierFilter,
        engine: engineFilter,
        department: departmentFilter,
      }),
    [search, tierFilter, engineFilter, departmentFilter],
  );

  const tier1 = useMemo(() => filtered.filter((a) => a.tier === 1), [filtered]);
  const tier2 = useMemo(() => filtered.filter((a) => a.tier === 2), [filtered]);
  const tier3 = useMemo(() => filtered.filter((a) => a.tier === 3), [filtered]);

  const activeAgent: StudioAgent | null = selectedAgentId
    ? AGENT_BY_ID[selectedAgentId] || null
    : filtered[0] || null;

  const directReports = useMemo(() => {
    if (!activeAgent) return [];
    return STUDIO_AGENTS.filter((a) => a.reportsTo === activeAgent.id);
  }, [activeAgent]);

  return (
    <div className="max-w-[1320px] mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Summary & Controls */}
      <section className="bg-[#12161F] border border-[#222836] rounded-xl p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-[#F3F6FC]">
              Studio Organization — 49 Specialized Agents
            </h2>
            <p className="text-sm text-[#9BA5B8]">
              Three-tier studio hierarchy: 3 Directors set vision, 8 Department Leads own domain quality, and 38 Specialists execute across Core, Godot, Unity, and Unreal.
            </p>
          </div>

          <div
            role="tablist"
            aria-label="Roster view layout"
            className="inline-flex items-center gap-1 p-1 rounded-lg bg-[#0B0E14] border border-[#222836] self-start shrink-0"
          >
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'hierarchy'}
              onClick={() => setViewMode('hierarchy')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                viewMode === 'hierarchy'
                  ? 'bg-[#1F2636] text-[#F8FAFC]'
                  : 'text-[#8E99AD] hover:text-[#E6EAF2]'
              }`}
            >
              Hierarchy View
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'table'}
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                viewMode === 'table'
                  ? 'bg-[#1F2636] text-[#F8FAFC]'
                  : 'text-[#8E99AD] hover:text-[#E6EAF2]'
              }`}
            >
              Directory Table
            </button>
          </div>
        </div>

        {/* 1-Click Quick Role & Engine Filters */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { label: 'All Team (49)', tier: 'all' as const, engine: 'all' as const },
            { label: 'Directors (3)', tier: 1 as const, engine: 'all' as const },
            { label: 'Department Leads (8)', tier: 2 as const, engine: 'all' as const },
            { label: 'Godot Specialists (5)', tier: 'all' as const, engine: 'Godot' as const },
            { label: 'Unity Specialists (5)', tier: 'all' as const, engine: 'Unity' as const },
            { label: 'Unreal Specialists (5)', tier: 'all' as const, engine: 'Unreal' as const },
          ].map((preset) => {
            const active =
              tierFilter === preset.tier &&
              engineFilter === preset.engine &&
              departmentFilter === 'all' &&
              !search.trim();
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  setTierFilter(preset.tier);
                  setEngineFilter(preset.engine);
                  setDepartmentFilter('all');
                  setSearch('');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-[#1F2636] text-[#F8FAFC] border border-[#E5A00D]/50'
                    : 'bg-[#0E121A] text-[#9BA5B8] hover:text-[#E6EAF2] border border-[#222836]'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        {/* Filter Bar */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2 border-t border-[#1D2330]">
          <div className="md:col-span-4 relative">
            <label htmlFor="agent-search" className="sr-only">
              Search agents
            </label>
            <Search className="w-4 h-4 text-[#6E7A91] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="agent-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by role, ID, or specialty..."
              className="w-full h-10 pl-9 pr-3 rounded-lg bg-[#0B0E14] border border-[#262E40] text-sm text-[#F3F6FC] placeholder:text-[#5E6A82] focus:outline-none focus:border-[#E5A00D]"
            />
          </div>

          <div className="md:col-span-3">
            <label htmlFor="agent-tier-filter" className="sr-only">
              Filter by tier
            </label>
            <select
              id="agent-tier-filter"
              value={String(tierFilter)}
              onChange={(e) => {
                const v = e.target.value;
                setTierFilter(v === 'all' ? 'all' : (Number(v) as 1 | 2 | 3));
              }}
              className="w-full h-10 px-3 rounded-lg bg-[#0B0E14] border border-[#262E40] text-sm text-[#E6EAF2] focus:outline-none focus:border-[#E5A00D]"
            >
              <option value="all">All Tiers (49)</option>
              <option value="1">Tier 1 — Directors (3)</option>
              <option value="2">Tier 2 — Department Leads (8)</option>
              <option value="3">Tier 3 — Specialists (38)</option>
            </select>
          </div>

          <div className="md:col-span-3">
            <label htmlFor="agent-dept-filter" className="sr-only">
              Filter by department
            </label>
            <select
              id="agent-dept-filter"
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="w-full h-10 px-3 rounded-lg bg-[#0B0E14] border border-[#262E40] text-sm text-[#E6EAF2] focus:outline-none focus:border-[#E5A00D]"
            >
              <option value="all">All Departments</option>
              {AGENT_DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label htmlFor="agent-engine-filter" className="sr-only">
              Filter by engine scope
            </label>
            <select
              id="agent-engine-filter"
              value={engineFilter}
              onChange={(e) =>
                setEngineFilter(e.target.value as 'all' | AgentEngineScope)
              }
              className="w-full h-10 px-3 rounded-lg bg-[#0B0E14] border border-[#262E40] text-sm text-[#E6EAF2] focus:outline-none focus:border-[#E5A00D]"
            >
              {ENGINE_OPTIONS.map((eng) => (
                <option key={eng} value={eng}>
                  {eng === 'all' ? 'All Engines' : eng}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Main Content + Agent Dossier */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <div className="xl:col-span-8 space-y-6">
          {filtered.length === 0 ? (
            <div className="bg-[#12161F] border border-[#222836] rounded-xl p-10 text-center space-y-3">
              <p className="text-sm text-[#9BA5B8]">
                No agents match your current filter combination.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setTierFilter('all');
                  setEngineFilter('all');
                  setDepartmentFilter('all');
                }}
                className="px-4 py-2 rounded-lg text-xs font-medium bg-[#1B2231] hover:bg-[#232C3F] text-[#F3F6FC]"
              >
                Reset Filters
              </button>
            </div>
          ) : viewMode === 'hierarchy' ? (
            <div className="space-y-6">
              {[
                { label: 'Tier 1 — Directors', items: tier1 },
                { label: 'Tier 2 — Department Leads', items: tier2 },
                { label: 'Tier 3 — Specialists', items: tier3 },
              ]
                .filter((group) => group.items.length > 0)
                .map((group) => (
                  <section key={group.label} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-display text-sm font-semibold text-[#C5CDDC]">
                        {group.label}
                      </h3>
                      <span className="font-mono text-xs tabular-nums text-[#7C879C]">
                        {group.items.length}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {group.items.map((agent) => {
                        const isSelected = activeAgent?.id === agent.id;
                        return (
                          <button
                            key={agent.id}
                            type="button"
                            onClick={() => onSelectAgent(agent.id)}
                            className={`text-left p-4 rounded-xl border transition-colors ${
                              isSelected
                                ? 'bg-[#191F2D] border-[#E5A00D]/60'
                                : 'bg-[#12161F] border-[#222836] hover:border-[#323C52]'
                            }`}
                          >
                            <div className="flex items-baseline justify-between gap-2">
                              <span className="font-display text-sm font-semibold text-[#F3F6FC]">
                                {agent.name}
                              </span>
                              <span className="font-mono text-[11px] text-[#8E99AD] shrink-0">
                                {agent.engine}
                              </span>
                            </div>
                            <div className="text-xs text-[#7C879C] mt-0.5 flex items-center gap-1.5">
                              <span>{agent.department}</span>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono">{agent.model}</span>
                            </div>
                            <p className="text-xs text-[#A9B3C5] mt-2 line-clamp-2 leading-relaxed">
                              {agent.description}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ))}
            </div>
          ) : (
            <div className="bg-[#12161F] border border-[#222836] rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#222836] text-xs font-medium text-[#7C879C]">
                      <th className="py-3 px-4">Agent</th>
                      <th className="py-3 px-4">Tier</th>
                      <th className="py-3 px-4">Department</th>
                      <th className="py-3 px-4">Engine</th>
                      <th className="py-3 px-4 text-right">Max Turns</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1C2230] text-sm">
                    {filtered.map((agent) => {
                      const isSelected = activeAgent?.id === agent.id;
                      return (
                        <tr
                          key={agent.id}
                          onClick={() => onSelectAgent(agent.id)}
                          className={`cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-[#191F2D]'
                              : 'hover:bg-[#161B26]'
                          }`}
                        >
                          <td className="py-3 px-4">
                            <button
                              type="button"
                              onClick={() => onSelectAgent(agent.id)}
                              className="font-medium text-[#F3F6FC] hover:text-[#E5A00D] text-left"
                            >
                              {agent.name}
                            </button>
                            <div className="font-mono text-xs text-[#6E7A91]">
                              {agent.id}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-xs text-[#B8C2D4] whitespace-nowrap">
                            Tier {agent.tier} · {agent.tierLabel}
                          </td>
                          <td className="py-3 px-4 text-xs text-[#9BA5B8] whitespace-nowrap">
                            {agent.department}
                          </td>
                          <td className="py-3 px-4 font-mono text-xs text-[#9BA5B8]">
                            {agent.engine}
                          </td>
                          <td className="py-3 px-4 font-mono text-xs tabular-nums text-right text-[#9BA5B8]">
                            {agent.maxTurns}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Agent Dossier Inspector */}
        <aside
          aria-label="Selected agent dossier"
          className="xl:col-span-4 bg-[#12161F] border border-[#222836] rounded-xl p-5 space-y-5 xl:sticky xl:top-20"
        >
          {activeAgent ? (
            <>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-mono text-xs text-[#E5A00D]">
                    {activeAgent.id}.md
                  </div>
                  <h3 className="font-display text-lg font-semibold text-[#F3F6FC] mt-0.5">
                    {activeAgent.name}
                  </h3>
                  <div className="text-xs text-[#8E99AD] mt-1 flex items-center gap-1.5 flex-wrap">
                    <span>Tier {activeAgent.tier} {activeAgent.tierLabel}</span>
                    <span aria-hidden="true">·</span>
                    <span>{activeAgent.department}</span>
                  </div>
                </div>
                {selectedAgentId && (
                  <button
                    type="button"
                    onClick={() => onSelectAgent(null)}
                    aria-label="Clear selected agent"
                    className="p-1 text-[#7C879C] hover:text-[#F3F6FC]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <p className="text-sm text-[#CBD4E3] leading-relaxed">
                {activeAgent.description}
              </p>

              <div className="grid grid-cols-2 gap-3 py-3 border-y border-[#1E2433] text-xs">
                <div>
                  <div className="text-[#7C879C]">Reports To</div>
                  <div className="text-[#E6EAF2] font-medium mt-0.5">
                    {AGENT_BY_ID[activeAgent.reportsTo]?.name || activeAgent.reportsTo}
                  </div>
                </div>
                <div>
                  <div className="text-[#7C879C]">Model Pin</div>
                  <div className="font-mono text-[#E6EAF2] mt-0.5">
                    {activeAgent.model}
                  </div>
                </div>
                <div>
                  <div className="text-[#7C879C]">Engine Scope</div>
                  <div className="text-[#E6EAF2] mt-0.5">{activeAgent.engine}</div>
                </div>
                <div>
                  <div className="text-[#7C879C]">Turn Budget</div>
                  <div className="font-mono tabular-nums text-[#E6EAF2] mt-0.5">
                    {activeAgent.maxTurns} turns · {activeAgent.memory} memory
                  </div>
                </div>
              </div>

              {activeAgent.mandate && (
                <div className="space-y-1.5">
                  <div className="text-xs font-medium text-[#8E99AD]">
                    Role Mandate
                  </div>
                  <p className="text-xs text-[#A9B3C5] leading-relaxed">
                    {activeAgent.mandate}
                  </p>
                </div>
              )}

              <div className="space-y-2 text-xs">
                <div className="text-[#8E99AD] font-medium">Allowed Tools</div>
                <div className="font-mono text-[#CBD4E3] leading-relaxed">
                  {activeAgent.tools.length > 0
                    ? activeAgent.tools.join(' · ')
                    : 'Inherits session defaults'}
                </div>
                {activeAgent.disallowedTools.length > 0 && (
                  <div className="text-[#F87171] font-mono">
                    Restricted: {activeAgent.disallowedTools.join(', ')}
                  </div>
                )}
              </div>

              {directReports.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-[#8E99AD]">
                    Direct Reports ({directReports.length})
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {directReports.slice(0, 8).map((rep) => (
                      <button
                        key={rep.id}
                        type="button"
                        onClick={() => onSelectAgent(rep.id)}
                        className="px-2.5 py-1 rounded-md text-xs text-[#CBD4E3] hover:text-[#E5A00D] bg-[#181D29] border border-[#252C3C] transition-colors"
                      >
                        {rep.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => onConsultAgent(activeAgent.id)}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-[#E5A00D] hover:bg-[#F0B429] text-[#0B0E14] text-sm font-semibold transition-colors"
              >
                <span>Consult {activeAgent.name}</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </>
          ) : (
            <p className="text-sm text-[#8E99AD]">
              Select any agent from the roster to inspect their reporting chain, tool permissions, and domain mandate.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
