import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import type { DelegationStep, ProjectConfig } from './src/types/studio';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const MODEL_NAME = 'gemini-4-hydrogen';

function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

interface ExecuteRequestBody {
  input: string;
  command: string;
  promptBody: string;
  config: ProjectConfig;
  delegation: DelegationStep[];
  existingArtifacts?: Array<{ title: string; path: string; kind: string }>;
}

const app = express();
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    model: MODEL_NAME,
    aiConfigured: Boolean(process.env.GEMINI_API_KEY?.trim()),
  });
});

app.post('/api/studio/execute', async (req, res) => {
  const body = req.body as Partial<ExecuteRequestBody>;
  if (!body || typeof body.input !== 'string' || !body.input.trim()) {
    res.status(400).json({ error: 'Command input is required.' });
    return;
  }

  const ai = getAiClient();
  if (!ai) {
    res.status(503).json({
      error:
        'GEMINI_API_KEY is not configured on the server. Add it in Settings > Secrets to execute live studio sessions.',
    });
    return;
  }

  const command = body.command || '/start';
  const isPrototype = command === '/prototype';
  const delegation = Array.isArray(body.delegation) ? body.delegation : [];
  const config = body.config;

  const rosterSummary = delegation
    .map(
      (step) =>
        `- agentId="${step.agentId}" | ${step.agentName} (Tier ${step.tier} ${step.tierLabel}, ${step.department}): ${step.roleInRun}`,
    )
    .join('\n');

  const existingSummary = (body.existingArtifacts || [])
    .slice(0, 6)
    .map((a) => `- ${a.path} (${a.kind}): ${a.title}`)
    .join('\n');

  const systemInstruction = [
    'You are the coordinated multi-agent engine for Claude Code Game Studios.',
    'Produce crisp, practical, studio-grade game development deliverables grounded in real game design, architecture, production, and QA craft.',
    'You MUST populate every required JSON field: title, summary (2-3 sentences), agentNotes (one entry per assigned agent using the exact agentId provided), artifactPath, artifactKind, artifactContent (full structured Markdown), qaChecklist (3-4 items), and recommendedNextCommands (3 follow-up slash commands).',
    isPrototype
      ? 'Because the user invoked /prototype, ALSO populate playableHtml with a complete, self-contained single-file HTML5 Canvas playable game (<!doctype html>...</html>) matching their exact game concept. Rules for playableHtml: zero external URLs or CDNs, draw all entities on HTML5 Canvas (never emoji art), include responsive resize, clear keyboard/mouse controls, an unobtrusive HUD (score/status), and a working play-and-restart loop with zero syntax or runtime errors.'
      : 'Leave playableHtml as an empty string unless the command explicitly requests a playable HTML5 prototype.',
  ].join(' ');

  const userPrompt = [
    `Active Project: ${config?.projectName || 'Untitled Game'}`,
    `Target Engine: ${config?.engine || 'Web'} (${config?.engineVersion || 'Vite + TypeScript'})`,
    `Genre: ${config?.genre || 'Indie Game'}`,
    `Workflow Mode: ${config?.workflowMode || 'lean'} | Automation: ${config?.automationMode || 'collaborative'}`,
    '',
    `Invoked Command: ${body.input}`,
    '',
    'Assigned Delegation Chain (include one agentNotes item for every agentId below):',
    rosterSummary || '- agentId="producer" | Producer (Tier 1 Director): Coordinate request',
    '',
    existingSummary ? `Existing Workspace Artifacts:\n${existingSummary}` : '',
    '',
    'Respond strictly in JSON matching the requested schema.',
  ].join('\n');

  try {
    let response;
    let lastError: unknown = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        response = await ai.models.generateContent({
          model: MODEL_NAME,
          contents: userPrompt,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              required: [
                'title',
                'summary',
                'agentNotes',
                'artifactPath',
                'artifactKind',
                'artifactContent',
                'qaChecklist',
                'recommendedNextCommands',
              ],
              properties: {
                title: { type: Type.STRING, description: 'Clear title for this studio deliverable.' },
                summary: {
                  type: Type.STRING,
                  description: '2-3 sentence executive summary of what the studio produced.',
                },
                agentNotes: {
                  type: Type.ARRAY,
                  description: 'Role-specific notes for each agent in the delegation chain.',
                  items: {
                    type: Type.OBJECT,
                    required: ['agentId', 'note'],
                    properties: {
                      agentId: { type: Type.STRING },
                      note: { type: Type.STRING },
                    },
                  },
                },
                artifactPath: {
                  type: Type.STRING,
                  description:
                    'Relative project path such as design/game-brief.md, docs/architecture/ADR-002.md, or production/sprint-02.md.',
                },
                artifactKind: {
                  type: Type.STRING,
                  description: 'One of: brief, gdd, adr, sprint, review, prototype, art-bible, code.',
                },
                artifactContent: {
                  type: Type.STRING,
                  description: 'Complete structured Markdown deliverable.',
                },
                playableHtml: {
                  type: Type.STRING,
                  description:
                    'Self-contained HTML5 Canvas game if /prototype was invoked, otherwise empty string.',
                },
                qaChecklist: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    required: ['item', 'status'],
                    properties: {
                      item: { type: Type.STRING },
                      status: {
                        type: Type.STRING,
                        description: 'One of: pass, needs-human-play, check',
                      },
                    },
                  },
                },
                recommendedNextCommands: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
              },
            },
          },
        });
        break;
      } catch (retryErr: unknown) {
        lastError = retryErr;
        const retryMsg = retryErr instanceof Error ? retryErr.message : String(retryErr);
        const isTransient =
          retryMsg.includes('503') ||
          retryMsg.includes('UNAVAILABLE') ||
          retryMsg.includes('500');
        if (!isTransient || attempt === 2) {
          throw retryErr;
        }
        await new Promise((resolve) => setTimeout(resolve, 600 * (attempt + 1)));
      }
    }

    if (!response) {
      throw lastError || new Error('No response returned from model.');
    }

    const rawText = (response.text ?? '').trim();
    if (!rawText) {
      res.status(502).json({ error: 'Model returned an empty response.' });
      return;
    }

    const parsed = JSON.parse(rawText);
    res.json(parsed);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const status =
      message.includes('403') || message.includes('PERMISSION_DENIED')
        ? 403
        : message.includes('429') || message.includes('RESOURCE_EXHAUSTED')
          ? 429
          : message.includes('503') || message.includes('UNAVAILABLE')
            ? 503
            : message.includes('400') || message.includes('API_KEY_INVALID')
              ? 400
              : 500;
    res.status(status).json({
      error: `Studio execution failed: ${message}`,
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Claude Code Game Studios server running at http://localhost:${PORT}`);
  });
}

startServer();
