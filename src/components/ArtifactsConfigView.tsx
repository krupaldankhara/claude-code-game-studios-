import { useEffect, useMemo, useState } from 'react';
import { Check, Copy, Download, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { GENRE_PRESETS, STUDIO_ENGINES } from '../data/studioCatalog';
import {
  generateClaudeLocalMd,
  generateProjectYaml,
  getEngineSpec,
  slugifyProjectName,
} from '../utils/configGenerator';
import { MarkdownViewer } from './MarkdownViewer';
import type {
  ArtifactKind,
  AutomationMode,
  EngineId,
  ProjectConfig,
  StudioArtifact,
  WorkflowMode,
} from '../types/studio';

interface ArtifactsConfigViewProps {
  config: ProjectConfig;
  onUpdateConfig: (next: ProjectConfig) => void;
  artifacts: StudioArtifact[];
  onAddArtifact: (artifact: StudioArtifact) => void;
  onDeleteArtifact: (id: string) => void;
  onOpenPrototypeInStudio: (artifact: StudioArtifact) => void;
  initialSubTab?: 'artifacts' | 'config';
  onResetWorkspace: () => void;
}

const ENGINE_DEFAULT_VERSIONS: Record<EngineId, string> = {
  Web: 'Vite + TypeScript',
  Godot: '4.4',
  Unity: '6000.0 LTS',
  Unreal: '5.5',
};

export function ArtifactsConfigView({
  config,
  onUpdateConfig,
  artifacts,
  onAddArtifact,
  onDeleteArtifact,
  onOpenPrototypeInStudio,
  initialSubTab = 'config',
  onResetWorkspace,
}: ArtifactsConfigViewProps) {
  const [subTab, setSubTab] = useState<'artifacts' | 'config'>(initialSubTab);
  const [selectedArtifactId, setSelectedArtifactId] = useState<string>(
    artifacts[0]?.id || '',
  );
  const [artifactRawMode, setArtifactRawMode] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [configDocTab, setConfigDocTab] = useState<'yaml' | 'claude'>('yaml');
  const [copiedDoc, setCopiedDoc] = useState(false);

  useEffect(() => {
    setSubTab(initialSubTab);
  }, [initialSubTab]);

  // New Artifact form state with validation
  const [showNewForm, setShowNewForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPath, setNewPath] = useState('design/gdd/new-system.md');
  const [newKind, setNewKind] = useState<ArtifactKind>('gdd');
  const [newContent, setNewContent] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const activeArtifact =
    artifacts.find((a) => a.id === selectedArtifactId) || artifacts[0] || null;

  const projectYaml = useMemo(() => generateProjectYaml(config), [config]);
  const claudeLocalMd = useMemo(() => generateClaudeLocalMd(config), [config]);
  const engineSpec = useMemo(() => getEngineSpec(config.engine), [config.engine]);

  const activeConfigText = configDocTab === 'yaml' ? projectYaml : claudeLocalMd;
  const activeConfigFilename =
    configDocTab === 'yaml' ? 'project.yaml' : 'CLAUDE.local.md';

  const handleCopyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedDoc(true);
      setTimeout(() => setCopiedDoc(false), 1800);
    } catch {
      // Clipboard may be restricted
    }
  };

  const handleDownloadFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleCreateArtifact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newPath.trim() || !newContent.trim()) {
      setFormError('Title, project path, and content are required.');
      return;
    }
    setFormError(null);
    const created: StudioArtifact = {
      id: `art-${Date.now()}`,
      title: newTitle.trim(),
      path: newPath.trim(),
      kind: newKind,
      command: '/quick-design',
      authorAgent: 'game-designer',
      updatedAt: new Date().toISOString(),
      content: newContent.trim(),
    };
    onAddArtifact(created);
    setSelectedArtifactId(created.id);
    setNewTitle('');
    setNewContent('');
    setShowNewForm(false);
  };

  return (
    <div className="max-w-[1320px] mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Sub-navigation Switch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="Project configuration and artifacts"
          className="inline-flex items-center gap-1 p-1 rounded-lg bg-[#12161F] border border-[#222836] self-start"
        >
          <button
            type="button"
            role="tab"
            aria-selected={subTab === 'config'}
            onClick={() => setSubTab('config')}
            className={`px-3.5 py-2 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
              subTab === 'config'
                ? 'bg-[#1F2636] text-[#F8FAFC]'
                : 'text-[#8E99AD] hover:text-[#E6EAF2]'
            }`}
          >
            Studio Config (project.yaml)
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={subTab === 'artifacts'}
            onClick={() => setSubTab('artifacts')}
            className={`px-3.5 py-2 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
              subTab === 'artifacts'
                ? 'bg-[#1F2636] text-[#F8FAFC]'
                : 'text-[#8E99AD] hover:text-[#E6EAF2]'
            }`}
          >
            Saved Artifacts ({artifacts.length})
          </button>
        </div>

        {subTab === 'artifacts' && (
          <button
            type="button"
            onClick={() => setShowNewForm((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#1A202E] hover:bg-[#242D40] text-[#F3F6FC] border border-[#2A3347] whitespace-nowrap self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{showNewForm ? 'Cancel New Artifact' : 'New Artifact'}</span>
          </button>
        )}
      </div>

      {/* SUB-TAB 1: Studio Config Builder */}
      {subTab === 'config' ? (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          <section className="xl:col-span-6 bg-[#12161F] border border-[#222836] rounded-xl p-5 space-y-5">
            <div>
              <h2 className="font-display text-lg font-semibold text-[#F3F6FC]">
                Project Configuration
              </h2>
              <p className="text-sm text-[#9BA5B8]">
                Configure engine routing, documentation depth, and director approval gates. Changes immediately update delegation in Studio Command.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="cfg-project-name" className="block text-xs font-medium text-[#9BA5B8] mb-1.5">
                  Project Name
                </label>
                <input
                  id="cfg-project-name"
                  type="text"
                  value={config.projectName}
                  onChange={(e) =>
                    onUpdateConfig({
                      ...config,
                      projectName: e.target.value,
                      slug: slugifyProjectName(e.target.value),
                    })
                  }
                  className="w-full h-10 px-3.5 rounded-lg bg-[#0B0E14] border border-[#262E40] text-sm text-[#F3F6FC] focus:outline-none focus:border-[#E5A00D]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="cfg-engine" className="block text-xs font-medium text-[#9BA5B8] mb-1.5">
                    Target Engine
                  </label>
                  <select
                    id="cfg-engine"
                    value={config.engine}
                    onChange={(e) => {
                      const nextEngine = e.target.value as EngineId;
                      onUpdateConfig({
                        ...config,
                        engine: nextEngine,
                        engineVersion: ENGINE_DEFAULT_VERSIONS[nextEngine],
                      });
                    }}
                    className="w-full h-10 px-3 rounded-lg bg-[#0B0E14] border border-[#262E40] text-sm text-[#E6EAF2] focus:outline-none focus:border-[#E5A00D]"
                  >
                    {STUDIO_ENGINES.map((eng) => (
                      <option key={eng.engine} value={eng.engine}>
                        {eng.engine}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="cfg-engine-ver" className="block text-xs font-medium text-[#9BA5B8] mb-1.5">
                    Engine Version
                  </label>
                  <input
                    id="cfg-engine-ver"
                    type="text"
                    value={config.engineVersion}
                    onChange={(e) =>
                      onUpdateConfig({ ...config, engineVersion: e.target.value })
                    }
                    className="w-full h-10 px-3 rounded-lg bg-[#0B0E14] border border-[#262E40] text-sm font-mono text-[#E6EAF2] focus:outline-none focus:border-[#E5A00D]"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="cfg-genre" className="block text-xs font-medium text-[#9BA5B8] mb-1.5">
                  Genre Chipset
                </label>
                <select
                  id="cfg-genre"
                  value={config.genre}
                  onChange={(e) =>
                    onUpdateConfig({ ...config, genre: e.target.value })
                  }
                  className="w-full h-10 px-3 rounded-lg bg-[#0B0E14] border border-[#262E40] text-sm text-[#E6EAF2] focus:outline-none focus:border-[#E5A00D]"
                >
                  {GENRE_PRESETS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="cfg-workflow" className="block text-xs font-medium text-[#9BA5B8] mb-1.5">
                    Workflow Mode
                  </label>
                  <select
                    id="cfg-workflow"
                    value={config.workflowMode}
                    onChange={(e) =>
                      onUpdateConfig({
                        ...config,
                        workflowMode: e.target.value as WorkflowMode,
                      })
                    }
                    className="w-full h-10 px-3 rounded-lg bg-[#0B0E14] border border-[#262E40] text-sm text-[#E6EAF2] focus:outline-none focus:border-[#E5A00D]"
                  >
                    <option value="full">Full — Complete GDD & Gates</option>
                    <option value="lean">Lean — Briefs & Fast Loop</option>
                    <option value="solo">Solo — Direct Specialist</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="cfg-automation" className="block text-xs font-medium text-[#9BA5B8] mb-1.5">
                    Automation Mode
                  </label>
                  <select
                    id="cfg-automation"
                    value={config.automationMode}
                    onChange={(e) =>
                      onUpdateConfig({
                        ...config,
                        automationMode: e.target.value as AutomationMode,
                      })
                    }
                    className="w-full h-10 px-3 rounded-lg bg-[#0B0E14] border border-[#262E40] text-sm text-[#E6EAF2] focus:outline-none focus:border-[#E5A00D]"
                  >
                    <option value="guided">Guided — Confirm each step</option>
                    <option value="collaborative">Collaborative — Key gates</option>
                    <option value="autonomous">Autonomous — End-to-end</option>
                  </select>
                </div>
              </div>

              <fieldset className="pt-2 border-t border-[#1D2330] space-y-2.5">
                <legend className="text-xs font-medium text-[#9BA5B8] mb-1">
                  Director Review Gates
                </legend>
                {[
                  {
                    key: 'creativeReview' as const,
                    label: 'Creative Director pillar review before prototype build',
                  },
                  {
                    key: 'architectureReview' as const,
                    label: 'Technical Director ADR review on core systems',
                  },
                  {
                    key: 'qaReleaseGate' as const,
                    label: 'QA Lead smoke verification before handover',
                  },
                ].map((gate) => (
                  <label
                    key={gate.key}
                    className="flex items-center gap-2.5 text-sm text-[#CBD4E3] cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={config.directorGates[gate.key]}
                      onChange={(e) =>
                        onUpdateConfig({
                          ...config,
                          directorGates: {
                            ...config.directorGates,
                            [gate.key]: e.target.checked,
                          },
                        })
                      }
                      className="w-4 h-4 rounded accent-[#E5A00D]"
                    />
                    <span>{gate.label}</span>
                  </label>
                ))}
              </fieldset>
            </div>

            {/* Active Engine Toolchain from engines.tsv */}
            <div className="pt-4 border-t border-[#1D2330] space-y-2">
              <div className="text-xs font-medium text-[#8E99AD]">
                Engine Roots & Commands ({engineSpec.engine} · engines.tsv)
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs font-mono bg-[#0B0E14] border border-[#1E2534] rounded-lg p-3">
                <div>
                  <div className="text-[#6E7A91]">code_root</div>
                  <div className="text-[#E6EAF2] mt-0.5">{engineSpec.code_root}</div>
                </div>
                <div>
                  <div className="text-[#6E7A91]">test_root</div>
                  <div className="text-[#E6EAF2] mt-0.5 truncate">{engineSpec.test_root}</div>
                </div>
                <div>
                  <div className="text-[#6E7A91]">asset_root</div>
                  <div className="text-[#E6EAF2] mt-0.5">{engineSpec.asset_root}</div>
                </div>
              </div>
            </div>

            {/* Reset Demo Workspace */}
            <div className="pt-4 border-t border-[#1D2330] flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-[#8E99AD]">
                Restore the starter Duskwater Angler project and sample documents.
              </div>
              {confirmReset ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmReset(false)}
                    className="px-3 py-1.5 rounded-md text-xs text-[#9BA5B8] hover:text-[#F3F6FC]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onResetWorkspace();
                      setConfirmReset(false);
                    }}
                    className="px-3 py-1.5 rounded-md text-xs font-semibold bg-[#DC2626] hover:bg-[#EF4444] text-white whitespace-nowrap"
                  >
                    Confirm Reset
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmReset(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-[#CBD4E3] bg-[#181D29] hover:bg-[#22293A] border border-[#283044] whitespace-nowrap"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Demo Workspace</span>
                </button>
              )}
            </div>
          </section>

          {/* Live Export Preview */}
          <section className="xl:col-span-6 bg-[#12161F] border border-[#222836] rounded-xl overflow-hidden">
            <div className="p-4 border-b border-[#222836] flex flex-wrap items-center justify-between gap-3">
              <div
                role="tablist"
                aria-label="Generated configuration files"
                className="inline-flex items-center gap-1 p-1 rounded-lg bg-[#0B0E14] border border-[#222836]"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={configDocTab === 'yaml'}
                  onClick={() => setConfigDocTab('yaml')}
                  className={`px-3 py-1.5 rounded-md font-mono text-xs transition-colors ${
                    configDocTab === 'yaml'
                      ? 'bg-[#1F2636] text-[#F8FAFC]'
                      : 'text-[#8E99AD] hover:text-[#E6EAF2]'
                  }`}
                >
                  project.yaml
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={configDocTab === 'claude'}
                  onClick={() => setConfigDocTab('claude')}
                  className={`px-3 py-1.5 rounded-md font-mono text-xs transition-colors ${
                    configDocTab === 'claude'
                      ? 'bg-[#1F2636] text-[#F8FAFC]'
                      : 'text-[#8E99AD] hover:text-[#E6EAF2]'
                  }`}
                >
                  CLAUDE.local.md
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyText(activeConfigText)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-[#CBD4E3] bg-[#181D29] hover:bg-[#22293A] border border-[#283044] whitespace-nowrap"
                >
                  {copiedDoc ? (
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
                  onClick={() =>
                    handleDownloadFile(activeConfigFilename, activeConfigText)
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-[#E5A00D] hover:bg-[#F0B429] text-[#0B0E14] whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
              </div>
            </div>

            <pre
              data-testid="generated-config-preview"
              className="p-5 font-mono text-xs text-[#D5DCEA] bg-[#0B0E14] whitespace-pre-wrap break-words leading-relaxed min-h-[420px]"
            >
              {activeConfigText}
            </pre>
          </section>
        </div>
      ) : (
        /* SUB-TAB 2: Project Artifacts Library */
        <div className="space-y-6">
          {showNewForm && (
            <form
              onSubmit={handleCreateArtifact}
              className="bg-[#12161F] border border-[#222836] rounded-xl p-5 space-y-4"
            >
              <h3 className="font-display text-base font-semibold text-[#F3F6FC]">
                Create Workspace Artifact
              </h3>
              {formError && (
                <p role="alert" className="text-xs text-[#F87171]">
                  {formError}
                </p>
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="new-art-title" className="block text-xs text-[#9BA5B8] mb-1">
                    Title
                  </label>
                  <input
                    id="new-art-title"
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Fishing Economy Tuning Spec"
                    className="w-full h-10 px-3 rounded-lg bg-[#0B0E14] border border-[#262E40] text-sm text-[#F3F6FC] focus:outline-none focus:border-[#E5A00D]"
                  />
                </div>
                <div>
                  <label htmlFor="new-art-path" className="block text-xs text-[#9BA5B8] mb-1">
                    Project Path
                  </label>
                  <input
                    id="new-art-path"
                    type="text"
                    value={newPath}
                    onChange={(e) => setNewPath(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-[#0B0E14] border border-[#262E40] text-sm font-mono text-[#F3F6FC] focus:outline-none focus:border-[#E5A00D]"
                  />
                </div>
                <div>
                  <label htmlFor="new-art-kind" className="block text-xs text-[#9BA5B8] mb-1">
                    Document Kind
                  </label>
                  <select
                    id="new-art-kind"
                    value={newKind}
                    onChange={(e) => setNewKind(e.target.value as ArtifactKind)}
                    className="w-full h-10 px-3 rounded-lg bg-[#0B0E14] border border-[#262E40] text-sm text-[#E6EAF2] focus:outline-none focus:border-[#E5A00D]"
                  >
                    <option value="brief">Game Brief</option>
                    <option value="gdd">System GDD</option>
                    <option value="adr">Architecture ADR</option>
                    <option value="sprint">Sprint Plan</option>
                    <option value="art-bible">Art Bible</option>
                    <option value="review">Code Review</option>
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="new-art-content" className="block text-xs text-[#9BA5B8] mb-1">
                  Markdown Content
                </label>
                <textarea
                  id="new-art-content"
                  rows={5}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="# System Specification..."
                  className="w-full p-3 rounded-lg bg-[#0B0E14] border border-[#262E40] text-xs font-mono text-[#F3F6FC] focus:outline-none focus:border-[#E5A00D]"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewForm(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-[#9BA5B8] hover:text-[#F3F6FC]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#E5A00D] hover:bg-[#F0B429] text-[#0B0E14]"
                >
                  Save Artifact
                </button>
              </div>
            </form>
          )}

          {artifacts.length === 0 ? (
            <div className="bg-[#12161F] border border-[#222836] rounded-xl p-10 text-center space-y-3">
              <p className="text-sm text-[#9BA5B8]">
                No artifacts saved in this workspace yet. Run a studio command or create a new document.
              </p>
              <button
                type="button"
                onClick={() => setShowNewForm(true)}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#E5A00D] text-[#0B0E14]"
              >
                Create First Artifact
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
              <div className="xl:col-span-4 bg-[#12161F] border border-[#222836] rounded-xl divide-y divide-[#1D2330] overflow-hidden">
                {artifacts.map((art) => {
                  const selected = activeArtifact?.id === art.id;
                  return (
                    <button
                      key={art.id}
                      type="button"
                      onClick={() => setSelectedArtifactId(art.id)}
                      className={`w-full text-left p-4 transition-colors ${
                        selected ? 'bg-[#191F2D]' : 'hover:bg-[#151A24]'
                      }`}
                    >
                      <div className="font-mono text-xs text-[#E5A00D] truncate">
                        {art.path}
                      </div>
                      <div className="text-sm font-medium text-[#F3F6FC] mt-1 line-clamp-1">
                        {art.title}
                      </div>
                      <div className="text-xs text-[#7C879C] mt-1 flex items-center gap-1.5">
                        <span className="uppercase">{art.kind}</span>
                        <span aria-hidden="true">·</span>
                        <span>{art.authorAgent}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {activeArtifact && (
                <div className="xl:col-span-8 bg-[#12161F] border border-[#222836] rounded-xl overflow-hidden">
                  <div className="p-4 border-b border-[#222836] flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-mono text-xs text-[#8E99AD] truncate">
                        {activeArtifact.path}
                      </div>
                      <h3 className="font-display text-base font-semibold text-[#F3F6FC] truncate">
                        {activeArtifact.title}
                      </h3>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="inline-flex items-center gap-1 p-0.5 rounded-md bg-[#0B0E14] border border-[#222836]">
                        <button
                          type="button"
                          onClick={() => setArtifactRawMode(false)}
                          className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                            !artifactRawMode
                              ? 'bg-[#1F2636] text-[#F8FAFC]'
                              : 'text-[#8E99AD] hover:text-[#E6EAF2]'
                          }`}
                        >
                          Formatted
                        </button>
                        <button
                          type="button"
                          onClick={() => setArtifactRawMode(true)}
                          className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                            artifactRawMode
                              ? 'bg-[#1F2636] text-[#F8FAFC]'
                              : 'text-[#8E99AD] hover:text-[#E6EAF2]'
                          }`}
                        >
                          Raw
                        </button>
                      </div>
                      {activeArtifact.playableHtml && (
                        <button
                          type="button"
                          onClick={() => onOpenPrototypeInStudio(activeArtifact)}
                          className="px-3 py-1.5 rounded-md text-xs font-semibold bg-[#E5A00D] hover:bg-[#F0B429] text-[#0B0E14] whitespace-nowrap"
                        >
                          Play Prototype
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          handleDownloadFile(
                            activeArtifact.path.split('/').pop() || 'artifact.md',
                            activeArtifact.content,
                          )
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-[#CBD4E3] bg-[#181D29] hover:bg-[#22293A] border border-[#283044] whitespace-nowrap"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteArtifact(activeArtifact.id)}
                        aria-label={`Delete artifact ${activeArtifact.title}`}
                        className="p-1.5 rounded-md text-[#8E99AD] hover:text-[#EF4444] hover:bg-[#2A1519] transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {artifactRawMode ? (
                    <pre className="p-5 font-mono text-xs text-[#D5DCEA] bg-[#0B0E14] whitespace-pre-wrap leading-relaxed max-h-[540px] overflow-y-auto">
                      {activeArtifact.content}
                    </pre>
                  ) : (
                    <div className="p-6 bg-[#0E121A] max-h-[540px] overflow-y-auto">
                      <MarkdownViewer content={activeArtifact.content} />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
