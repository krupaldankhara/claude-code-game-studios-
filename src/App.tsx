/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { StudioCommandView } from './components/StudioCommandView';
import { AgentRosterView } from './components/AgentRosterView';
import { SkillsCatalogView } from './components/SkillsCatalogView';
import { GovernanceView } from './components/GovernanceView';
import { ArtifactsConfigView } from './components/ArtifactsConfigView';
import {
  STUDIO_AGENTS,
  STUDIO_HOOKS,
  STUDIO_RULES,
  STUDIO_SKILLS,
} from './data/studioCatalog';
import {
  DEFAULT_PROJECT_CONFIG,
  SEED_ARTIFACTS,
  SEED_SESSION_TURNS,
} from './data/seedWorkspace';
import { parseStudioInput, resolveDelegationChain } from './utils/studioRouter';
import type {
  ArtifactKind,
  ProjectConfig,
  QaCheckItem,
  StudioArtifact,
  StudioSessionTurn,
  WorkspaceTab,
} from './types/studio';

const STORAGE_KEYS = {
  config: 'ccgs_project_config_v1',
  artifacts: 'ccgs_artifacts_v1',
  turns: 'ccgs_session_turns_v1',
};

function loadStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

interface ApiExecuteResponse {
  title?: string;
  summary?: string;
  agentNotes?: Array<{ agentId: string; note: string }>;
  artifactPath?: string;
  artifactKind?: ArtifactKind;
  artifactContent?: string;
  playableHtml?: string;
  qaChecklist?: QaCheckItem[];
  recommendedNextCommands?: string[];
  error?: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('command');
  const [configSubTab, setConfigSubTab] = useState<'artifacts' | 'config'>('config');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const [config, setConfig] = useState<ProjectConfig>(() =>
    loadStored(STORAGE_KEYS.config, DEFAULT_PROJECT_CONFIG),
  );
  const [artifacts, setArtifacts] = useState<StudioArtifact[]>(() =>
    loadStored(STORAGE_KEYS.artifacts, SEED_ARTIFACTS),
  );
  const [turns, setTurns] = useState<StudioSessionTurn[]>(() =>
    loadStored(STORAGE_KEYS.turns, SEED_SESSION_TURNS),
  );

  const [selectedTurnId, setSelectedTurnId] = useState<string>(
    () => turns[0]?.id || '',
  );
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [pinnedAgentId, setPinnedAgentId] = useState<string | null>(null);
  const [commandDraft, setCommandDraft] = useState<string>('');
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [executionError, setExecutionError] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.config, JSON.stringify(config));
    } catch {
      // Ignore quota issues
    }
  }, [config]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.artifacts, JSON.stringify(artifacts));
    } catch {
      // Ignore quota issues
    }
  }, [artifacts]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.turns, JSON.stringify(turns));
    } catch {
      // Ignore quota issues
    }
  }, [turns]);

  const handleExecuteCommand = async (rawInput: string) => {
    const trimmed = rawInput.trim();
    if (!trimmed) return;

    const parsed = parseStudioInput(trimmed);
    const delegation = resolveDelegationChain(
      parsed.command,
      config.engine,
      config.workflowMode,
      pinnedAgentId || undefined,
    );

    setIsExecuting(true);
    setExecutionError(null);

    try {
      const response = await fetch('/api/studio/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: trimmed,
          command: parsed.command,
          promptBody: parsed.promptBody,
          config,
          delegation,
          existingArtifacts: artifacts.map((a) => ({
            title: a.title,
            path: a.path,
            kind: a.kind,
          })),
        }),
      });

      const data = (await response.json()) as ApiExecuteResponse;
      if (!response.ok || data.error) {
        throw new Error(data.error || `Request failed with status ${response.status}`);
      }

      const noteByAgent = new Map(
        (data.agentNotes || []).map((n) => [n.agentId, n.note]),
      );

      const enrichedDelegation = delegation.map((step) => ({
        ...step,
        note: noteByAgent.get(step.agentId) || step.roleInRun,
      }));

      const nowIso = new Date().toISOString();
      const artifactId = `art-${Date.now()}`;
      const turnId = `turn-${Date.now()}`;
      const artifactPath = data.artifactPath || `design/${parsed.skillId}.md`;
      const artifactKind: ArtifactKind = data.artifactKind || 'brief';
      const artifactContent = data.artifactContent || data.summary || '';
      const playableHtml =
        data.playableHtml && data.playableHtml.trim().startsWith('<')
          ? data.playableHtml.trim()
          : undefined;

      const newArtifact: StudioArtifact = {
        id: artifactId,
        title: data.title || `${parsed.command} Deliverable`,
        path: artifactPath,
        kind: artifactKind,
        command: trimmed,
        authorAgent: enrichedDelegation[0]?.agentId || 'producer',
        updatedAt: nowIso,
        content: artifactContent,
        playableHtml,
      };

      const newTurn: StudioSessionTurn = {
        id: turnId,
        createdAt: nowIso,
        input: trimmed,
        command: parsed.command,
        title: newArtifact.title,
        summary: data.summary || 'Studio session completed.',
        delegation: enrichedDelegation,
        artifactId,
        artifactPath,
        artifactKind,
        artifactContent,
        playableHtml,
        qaChecklist: data.qaChecklist || [],
        recommendedNextCommands: data.recommendedNextCommands || [],
      };

      setArtifacts((prev) => [newArtifact, ...prev]);
      setTurns((prev) => [newTurn, ...prev]);
      setSelectedTurnId(turnId);
      setCommandDraft('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to execute studio command.';
      setExecutionError(msg);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleInspectAgent = (agentId: string) => {
    setSelectedAgentId(agentId);
    setActiveTab('agents');
  };

  const handleConsultAgent = (agentId: string) => {
    setPinnedAgentId(agentId);
    setActiveTab('command');
    if (!commandDraft.trim()) {
      setCommandDraft('/code-review ');
    }
  };

  const handleRunSkill = (command: string) => {
    setCommandDraft(`${command} `);
    setActiveTab('command');
  };

  const handleOpenPrototypeInStudio = (artifact: StudioArtifact) => {
    const matchingTurn = turns.find((t) => t.artifactId === artifact.id);
    if (matchingTurn) {
      setSelectedTurnId(matchingTurn.id);
    }
    setActiveTab('command');
  };

  const handleTopBarAction = () => {
    setActiveTab('command');
    setCommandDraft('');
  };

  const handleOpenArtifacts = () => {
    setConfigSubTab('artifacts');
    setActiveTab('config');
  };

  const handleResetWorkspace = () => {
    setConfig(DEFAULT_PROJECT_CONFIG);
    setArtifacts(SEED_ARTIFACTS);
    setTurns(SEED_SESSION_TURNS);
    setSelectedTurnId(SEED_SESSION_TURNS[0].id);
    setPinnedAgentId(null);
    setCommandDraft('');
    setExecutionError(null);
  };

  return (
    <div className="min-h-screen flex bg-[#0B0E14] text-[#E6EAF2]">
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        config={config}
        counts={{
          agents: STUDIO_AGENTS.length,
          skills: STUDIO_SKILLS.length,
          hooks: STUDIO_HOOKS.length,
          rules: STUDIO_RULES.length,
          artifacts: artifacts.length,
        }}
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          activeTab={activeTab}
          projectName={config.projectName}
          onOpenMobileNav={() => setMobileNavOpen(true)}
          onPrimaryAction={handleTopBarAction}
        />

        <main className="flex-1 pb-12">
          {activeTab === 'command' && (
            <StudioCommandView
              config={config}
              turns={turns}
              selectedTurnId={selectedTurnId}
              onSelectTurn={setSelectedTurnId}
              commandDraft={commandDraft}
              onChangeDraft={setCommandDraft}
              pinnedAgentId={pinnedAgentId}
              onClearPinnedAgent={() => setPinnedAgentId(null)}
              isExecuting={isExecuting}
              executionError={executionError}
              onDismissError={() => setExecutionError(null)}
              onExecuteCommand={handleExecuteCommand}
              onInspectAgent={handleInspectAgent}
              onOpenArtifacts={handleOpenArtifacts}
            />
          )}

          {activeTab === 'agents' && (
            <AgentRosterView
              selectedAgentId={selectedAgentId}
              onSelectAgent={setSelectedAgentId}
              onConsultAgent={handleConsultAgent}
            />
          )}

          {activeTab === 'skills' && (
            <SkillsCatalogView onRunSkill={handleRunSkill} />
          )}

          {activeTab === 'governance' && <GovernanceView />}

          {activeTab === 'config' && (
            <ArtifactsConfigView
              config={config}
              onUpdateConfig={setConfig}
              artifacts={artifacts}
              onAddArtifact={(art) => setArtifacts((prev) => [art, ...prev])}
              onDeleteArtifact={(id) =>
                setArtifacts((prev) => prev.filter((a) => a.id !== id))
              }
              onOpenPrototypeInStudio={handleOpenPrototypeInStudio}
              initialSubTab={configSubTab}
              onResetWorkspace={handleResetWorkspace}
            />
          )}
        </main>
      </div>
    </div>
  );
}
