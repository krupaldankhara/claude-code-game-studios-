import { Menu, Play } from 'lucide-react';
import type { WorkspaceTab } from '../types/studio';

interface TopBarProps {
  activeTab: WorkspaceTab;
  projectName: string;
  onOpenMobileNav: () => void;
  onPrimaryAction: () => void;
}

const TAB_LABELS: Record<WorkspaceTab, string> = {
  command: 'Studio Command',
  agents: 'Agent Roster',
  skills: 'Workflow Skills',
  governance: 'Hooks & Rules',
  config: 'Artifacts & Config',
};

const PRIMARY_ACTION_LABELS: Record<WorkspaceTab, string> = {
  command: 'New Prototype',
  agents: 'Open Command',
  skills: 'Open Command',
  governance: 'Open Command',
  config: 'Open Command',
};

export function TopBar({
  activeTab,
  projectName,
  onOpenMobileNav,
  onPrimaryAction,
}: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 h-14 px-4 sm:px-6 bg-[#0B0E14]/95 backdrop-blur border-b border-[#222836] flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileNav}
          aria-label="Open navigation menu"
          className="lg:hidden p-2 -ml-1 text-[#9BA5B8] hover:text-[#F3F6FC] rounded-md"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 text-sm min-w-0">
          <span className="text-[#8E99AD] truncate hidden sm:inline">
            {projectName}
          </span>
          <span className="text-[#4B5568] hidden sm:inline" aria-hidden="true">
            /
          </span>
          <h1 className="font-display font-semibold text-[#F3F6FC] truncate whitespace-nowrap">
            {TAB_LABELS[activeTab]}
          </h1>
        </div>
      </div>

      <button
        type="button"
        onClick={onPrimaryAction}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#E5A00D] hover:bg-[#F0B429] text-[#0B0E14] text-xs font-semibold transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F0B429]"
      >
        <Play className="w-3.5 h-3.5 fill-current" />
        <span>{PRIMARY_ACTION_LABELS[activeTab]}</span>
      </button>
    </header>
  );
}
