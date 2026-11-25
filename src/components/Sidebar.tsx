import {
  FileCode2,
  FolderKanban,
  ShieldCheck,
  Terminal,
  Users,
  X,
} from 'lucide-react';
import type { ProjectConfig, WorkspaceTab } from '../types/studio';

interface SidebarProps {
  activeTab: WorkspaceTab;
  onSelectTab: (tab: WorkspaceTab) => void;
  config: ProjectConfig;
  counts: {
    agents: number;
    skills: number;
    hooks: number;
    rules: number;
    artifacts: number;
  };
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const NAV_ITEMS: Array<{
  id: WorkspaceTab;
  label: string;
  icon: typeof Terminal;
}> = [
  { id: 'command', label: 'Studio Command', icon: Terminal },
  { id: 'agents', label: 'Agent Roster', icon: Users },
  { id: 'skills', label: 'Workflow Skills', icon: FileCode2 },
  { id: 'governance', label: 'Hooks & Rules', icon: ShieldCheck },
  { id: 'config', label: 'Artifacts & Config', icon: FolderKanban },
];

export function Sidebar({
  activeTab,
  onSelectTab,
  config,
  counts,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const getCountLabel = (id: WorkspaceTab): string | null => {
    if (id === 'agents') return String(counts.agents);
    if (id === 'skills') return String(counts.skills);
    if (id === 'governance') return `${counts.hooks + counts.rules}`;
    if (id === 'config') return String(counts.artifacts);
    return null;
  };

  const content = (
    <div className="flex h-full flex-col bg-[#0F131B] border-r border-[#222836]">
      <div className="flex items-center justify-between px-5 h-14 border-b border-[#222836]">
        <span className="font-display text-[15px] font-semibold tracking-tight text-[#F3F6FC] whitespace-nowrap">
          Claude Code Game Studios
        </span>
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Close navigation menu"
          className="lg:hidden p-1.5 text-[#8E99AD] hover:text-[#F3F6FC] rounded-md"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <nav aria-label="Studio workspace" className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const count = getCountLabel(item.id);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelectTab(item.id);
                onCloseMobile();
              }}
              aria-current={isActive ? 'page' : undefined}
              className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E5A00D] ${
                isActive
                  ? 'bg-[#1A202E] text-[#F8FAFC]'
                  : 'text-[#9BA5B8] hover:text-[#E6EAF2] hover:bg-[#141923]'
              }`}
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-[#E5A00D]' : 'text-[#6E7A91]'
                  }`}
                />
                <span className="truncate whitespace-nowrap">{item.label}</span>
              </span>
              {count !== null && (
                <span className="font-mono text-xs tabular-nums text-[#7C879C] shrink-0">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-3 border-t border-[#222836]">
        <button
          type="button"
          onClick={() => {
            onSelectTab('config');
            onCloseMobile();
          }}
          className="w-full text-left p-2.5 rounded-lg hover:bg-[#161B26] transition-colors space-y-1.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E5A00D]"
        >
          <div className="flex items-center justify-between text-xs text-[#7C879C]">
            <span>Active Project</span>
            <span className="text-[#E5A00D]">Edit</span>
          </div>
          <div className="text-sm font-semibold text-[#F3F6FC] truncate">
            {config.projectName}
          </div>
          <div className="text-xs text-[#9BA5B8] flex items-center gap-1.5 flex-wrap">
            <span>{config.engine}</span>
            <span aria-hidden="true">·</span>
            <span className="capitalize">{config.workflowMode}</span>
            <span aria-hidden="true">·</span>
            <span className="capitalize">{config.automationMode}</span>
          </div>
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block w-[256px] shrink-0 h-screen sticky top-0">
        {content}
      </aside>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <button
            type="button"
            aria-label="Dismiss navigation backdrop"
            onClick={onCloseMobile}
            className="fixed inset-0 bg-black/65"
          />
          <aside className="relative z-10 w-[268px] max-w-[85vw] h-full">
            {content}
          </aside>
        </div>
      )}
    </>
  );
}
