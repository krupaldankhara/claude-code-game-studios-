import { useMemo, useState } from 'react';
import { ArrowRight, Search } from 'lucide-react';
import { SKILL_CATEGORIES, STUDIO_SKILLS } from '../data/studioCatalog';
import { filterSkills } from '../utils/studioRouter';

interface SkillsCatalogViewProps {
  onRunSkill: (command: string) => void;
}

const STARTER_WORKFLOWS = [
  {
    command: '/prototype',
    title: 'Build a Playable Prototype',
    summary: 'Turn a game idea into a one-page brief and playable browser game.',
  },
  {
    command: '/brainstorm',
    title: 'Brainstorm Game Concepts',
    summary: 'Explore mechanics, player motivation, and hook ideas with the studio.',
  },
  {
    command: '/design-system',
    title: 'Design a Core System',
    summary: 'Author a structured Game Design Document for one game mechanic.',
  },
  {
    command: '/art-bible',
    title: 'Define Visual Style',
    summary: 'Create palette, silhouette, and art direction rules before building assets.',
  },
  {
    command: '/sprint-plan',
    title: 'Plan Your Next Sprint',
    summary: 'Break milestones into scoped, testable stories with risk checks.',
  },
  {
    command: '/balance-check',
    title: 'Audit Difficulty & Economy',
    summary: 'Inspect catch rates, progression curves, and reward tuning.',
  },
];

export function SkillsCatalogView({ onRunSkill }: SkillsCatalogViewProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filtered = useMemo(
    () => filterSkills(STUDIO_SKILLS, search, selectedCategory),
    [search, selectedCategory],
  );

  return (
    <div className="max-w-[1320px] mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Friendly Starter Workflows */}
      {!search.trim() && selectedCategory === 'all' && (
        <section
          aria-label="Popular starter workflows"
          className="bg-[#12161F] border border-[#222836] rounded-xl p-5 space-y-4"
        >
          <div>
            <h2 className="font-display text-base font-semibold text-[#F3F6FC]">
              Popular Starter Workflows
            </h2>
            <p className="text-sm text-[#9BA5B8]">
              New to the studio? Start with one of these six core playbooks — or browse all 78 commands below.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {STARTER_WORKFLOWS.map((item) => (
              <button
                key={item.command}
                type="button"
                onClick={() => onRunSkill(item.command)}
                className="text-left p-4 rounded-lg bg-[#0E121A] hover:bg-[#171D2B] border border-[#222836] hover:border-[#E5A00D]/50 transition-colors space-y-1.5"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-semibold text-[#F3F6FC]">
                    {item.title}
                  </span>
                  <span className="font-mono text-xs text-[#E5A00D] shrink-0">
                    {item.command}
                  </span>
                </div>
                <p className="text-xs text-[#9BA5B8] leading-relaxed">
                  {item.summary}
                </p>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="bg-[#12161F] border border-[#222836] rounded-xl p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold text-[#F3F6FC]">
              All Workflow Skills — 78 Studio Commands
            </h2>
            <p className="text-sm text-[#9BA5B8]">
              Search every playbook in <code className="text-[#CBD4E3]">.claude/skills/</code> by keyword or production phase.
            </p>
          </div>
          <div className="font-mono text-xs tabular-nums text-[#8E99AD] shrink-0">
            Showing {filtered.length} of {STUDIO_SKILLS.length}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2 border-t border-[#1D2330]">
          <div className="md:col-span-6 relative">
            <label htmlFor="skills-search" className="sr-only">
              Search slash commands
            </label>
            <Search className="w-4 h-4 text-[#6E7A91] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="skills-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search slash commands (e.g. /prototype, /sprint-plan, /art-bible)..."
              className="w-full h-10 pl-9 pr-3 rounded-lg bg-[#0B0E14] border border-[#262E40] text-sm text-[#F3F6FC] placeholder:text-[#5E6A82] focus:outline-none focus:border-[#E5A00D]"
            />
          </div>

          <div className="md:col-span-6">
            <label htmlFor="skills-category-filter" className="sr-only">
              Filter by workflow phase
            </label>
            <select
              id="skills-category-filter"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full h-10 px-3 rounded-lg bg-[#0B0E14] border border-[#262E40] text-sm text-[#E6EAF2] focus:outline-none focus:border-[#E5A00D]"
            >
              <option value="all">All Phases ({STUDIO_SKILLS.length})</option>
              {SKILL_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {filtered.length === 0 ? (
        <div className="bg-[#12161F] border border-[#222836] rounded-xl p-10 text-center space-y-3">
          <p className="text-sm text-[#9BA5B8]">
            No workflow skills matched "{search}".
          </p>
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setSelectedCategory('all');
            }}
            className="px-4 py-2 rounded-lg text-xs font-medium bg-[#1B2231] hover:bg-[#232C3F] text-[#F3F6FC]"
          >
            Clear Search
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((skill) => (
            <article
              key={skill.id}
              className="bg-[#12161F] border border-[#222836] rounded-xl p-5 flex flex-col justify-between gap-4 hover:border-[#323C52] transition-colors"
            >
              <div className="space-y-2.5">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="font-mono text-sm font-semibold text-[#E5A00D]">
                    {skill.command}
                  </h3>
                  <span className="text-xs text-[#7C879C] truncate">
                    {skill.category}
                  </span>
                </div>

                {skill.argumentHint && (
                  <div className="font-mono text-[11px] text-[#8E99AD] bg-[#0B0E14] border border-[#1E2534] rounded px-2.5 py-1.5 truncate">
                    {skill.argumentHint}
                  </div>
                )}

                <p className="text-sm text-[#CBD4E3] leading-relaxed">
                  {skill.summary}
                </p>

                {skill.sections.length > 0 && (
                  <div className="text-xs text-[#7C879C] pt-1">
                    Steps: {skill.sections.slice(0, 3).join(' · ')}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-[#1D2330] flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => onRunSkill(skill.command)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-[#F3F6FC] bg-[#1A202E] hover:bg-[#242D40] transition-colors whitespace-nowrap"
                >
                  <span>Run in Studio</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
