import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header.js';
import { StudioWorkspace } from './components/BuildMode/StudioWorkspace.js';
import { AskChat } from './components/AskMode/AskChat.js';
import { AskSidebar } from './components/AskMode/AskSidebar.js';
import { BrandingCustomizerModal } from './components/Modals/BrandingCustomizerModal.js';
import { TemplateGalleryModal } from './components/Modals/TemplateGalleryModal.js';
import { SettingsModal } from './components/Modals/SettingsModal.js';
import { ExportModal } from './components/Modals/ExportModal.js';
import { MethodologyPage } from './components/Pages/MethodologyPage.js';
import { LegalPages } from './components/Pages/LegalPages.js';
import { TEMPLATES, TemplateProject } from './data/templates.js';
import { 
  ProjectFile, 
  Checkpoint, 
  FileScanResult, 
  RunSettings, 
  Conversation, 
  AskMessage,
  QuotaStats 
} from './types/index.js';
import { 
  generateProject, 
  scanProjectFiles, 
  askQuestionStream, 
  fetchQuotaStats 
} from './services/api.js';

export default function App() {
  // Navigation & Mode
  const [mode, setMode] = useState<'build' | 'ask'>('build');
  const [activePage, setActivePage] = useState<'workspace' | 'methodology' | 'about' | 'terms' | 'privacy'>('workspace');

  // Quota
  const [quotaStats, setQuotaStats] = useState<QuotaStats | null>(null);

  // Build Mode State
  const [projectName, setProjectName] = useState<string>('Pomodoro Focus Studio');
  const [files, setFiles] = useState<ProjectFile[]>(() => {
    const saved = localStorage.getItem('gf_project_files');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    // Default to first rich template
    return TEMPLATES[0].files;
  });

  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>(() => {
    const saved = localStorage.getItem('gf_checkpoints');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return [
      {
        id: 'initial',
        timestamp: Date.now(),
        prompt: 'Initial Pomodoro Starter',
        files: TEMPLATES[0].files,
        summary: 'Initialized with Pomodoro Focus Timer with Web Audio API chime.',
      },
    ];
  });

  const [historyIndex, setHistoryIndex] = useState<number>(() => {
    return checkpoints.length - 1;
  });

  const [scanResults, setScanResults] = useState<FileScanResult[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Settings
  const [settings, setSettings] = useState<RunSettings>({
    model: 'gemini-3.8-flash',
    temperature: 0.3,
    maxTokens: 4096,
    systemInstruction: '',
  });

  // Modals
  const [isBrandingOpen, setIsBrandingOpen] = useState(false);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);

  // Ask Mode State
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    const saved = localStorage.getItem('gf_ask_conversations');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return [
      {
        id: 'conv-welcome',
        title: 'Welcome to GenForge Ask AI',
        messages: [
          {
            id: 'msg-welcome',
            role: 'assistant',
            content: `### Welcome to GenForge Ask Mode\n\nI am your verified research assistant, engineered for precision, objective accuracy, and zero fabricated citations.\n\nKey capabilities:\n* **Streaming Real-time Reasoning**: Low-latency token generation.\n* **Deterministic Citations**: Only verifiable external references are cited.\n* **Dual Mode**: Switch seamlessly to **Build Mode** in the header to forge runnable code.\n\nHow can I help you today?`,
            timestamp: Date.now(),
          },
        ],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ];
  });

  const [activeConvId, setActiveConvId] = useState<string>('conv-welcome');
  const [isAskStreaming, setIsAskStreaming] = useState(false);
  const askAbortControllerRef = useRef<AbortController | null>(null);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('gf_project_files', JSON.stringify(files));
  }, [files]);

  useEffect(() => {
    localStorage.setItem('gf_checkpoints', JSON.stringify(checkpoints));
  }, [checkpoints]);

  useEffect(() => {
    localStorage.setItem('gf_ask_conversations', JSON.stringify(conversations));
  }, [conversations]);

  // Load quota stats on mount and interval
  useEffect(() => {
    fetchQuotaStats().then(setQuotaStats).catch(() => {});
    const interval = setInterval(() => {
      fetchQuotaStats().then(setQuotaStats).catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Run initial scan on files
  useEffect(() => {
    if (files.length > 0) {
      handleRunScan(files);
    }
  }, []);

  // Keyboard shortcuts (Ctrl+Z undo, Ctrl+S save checkpoint)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        // Create manual checkpoint
        const manualCp: Checkpoint = {
          id: `manual-${Date.now()}`,
          timestamp: Date.now(),
          prompt: 'Manual Checkpoint',
          files,
          summary: 'Saved editor state snapshot.',
        };
        setCheckpoints((prev) => [...prev, manualCp]);
        setHistoryIndex((prev) => prev + 1);
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        if (historyIndex > 0) {
          e.preventDefault();
          handleUndo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [files, historyIndex, checkpoints]);

  const handleRunScan = async (targetFiles: ProjectFile[]) => {
    setIsScanning(true);
    try {
      const data = await scanProjectFiles(targetFiles);
      setScanResults(data.results);
    } catch (err) {
      console.error('Scan error:', err);
    } finally {
      setIsScanning(false);
    }
  };

  const handleGenerate = async (promptText: string, image?: { base64: string; mimeType: string }) => {
    setIsGenerating(true);
    try {
      const result = await generateProject({
        prompt: promptText,
        currentFiles: files,
        image,
        settings,
      });

      setFiles(result.files);

      const newCp: Checkpoint = {
        id: `cp-${Date.now()}`,
        timestamp: Date.now(),
        prompt: promptText,
        files: result.files,
        summary: result.summary,
      };

      setCheckpoints((prev) => [...prev, newCp]);
      setHistoryIndex((prev) => prev + 1);

      // Trigger automatic vulnerability scan on newly generated files
      handleRunScan(result.files);
      fetchQuotaStats().then(setQuotaStats).catch(() => {});
    } catch (err: any) {
      alert(`Generation failed: ${err.message || 'Please retry.'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFixWithAI = (errorMessage: string) => {
    const fixPrompt = `Fix the following runtime/console error in the application:\n"${errorMessage}"\nEnsure the code handles edge cases, cleans up event listeners, and runs cleanly without exceptions.`;
    handleGenerate(fixPrompt);
  };

  const handleSelectTemplate = (t: TemplateProject) => {
    setProjectName(t.name);
    setFiles(t.files);

    const templateCp: Checkpoint = {
      id: `tmpl-${Date.now()}`,
      timestamp: Date.now(),
      prompt: `Loaded template: ${t.name}`,
      files: t.files,
      summary: t.description,
    };
    setCheckpoints([templateCp]);
    setHistoryIndex(0);
    handleRunScan(t.files);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIdx = historyIndex - 1;
      setHistoryIndex(newIdx);
      setFiles(checkpoints[newIdx].files);
      handleRunScan(checkpoints[newIdx].files);
    }
  };

  const handleRedo = () => {
    if (historyIndex < checkpoints.length - 1) {
      const newIdx = historyIndex + 1;
      setHistoryIndex(newIdx);
      setFiles(checkpoints[newIdx].files);
      handleRunScan(checkpoints[newIdx].files);
    }
  };

  // Ask Mode Actions
  const activeConversation = conversations.find((c) => c.id === activeConvId) || conversations[0];

  const handleAskSendMessage = (text: string, enableSearch?: boolean) => {
    if (!text.trim() || isAskStreaming) return;

    const userMsg: AskMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    const assistantMsgId = `ast-${Date.now()}`;
    const assistantPlaceholder: AskMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      isStreaming: true,
      timestamp: Date.now(),
    };

    const updatedMessages = [...(activeConversation?.messages || []), userMsg, assistantPlaceholder];

    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversation.id
          ? {
              ...c,
              messages: updatedMessages,
              updatedAt: Date.now(),
              title: c.messages.length <= 1 ? text.slice(0, 30) : c.title,
            }
          : c
      )
    );

    setIsAskStreaming(true);
    const controller = new AbortController();
    askAbortControllerRef.current = controller;

    // Filter messages for backend
    const apiPayload = updatedMessages
      .slice(0, -1)
      .map((m) => ({ role: m.role, content: m.content }));

    askQuestionStream(
      apiPayload,
      Boolean(enableSearch),
      {
        onChunk: (chunk) => {
          setConversations((prev) =>
            prev.map((c) => {
              if (c.id !== activeConversation.id) return c;
              return {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === assistantMsgId ? { ...m, content: m.content + chunk } : m
                ),
              };
            })
          );
        },
        onSources: (sources) => {
          setConversations((prev) =>
            prev.map((c) => {
              if (c.id !== activeConversation.id) return c;
              return {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === assistantMsgId ? { ...m, sources, searchedWeb: true } : m
                ),
              };
            })
          );
        },
        onError: (errText) => {
          setConversations((prev) =>
            prev.map((c) => {
              if (c.id !== activeConversation.id) return c;
              return {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === assistantMsgId
                    ? { ...m, content: `${m.content}\n\n⚠️ Error: ${errText}`, isStreaming: false }
                    : m
                ),
              };
            })
          );
          setIsAskStreaming(false);
        },
        onDone: (data) => {
          setConversations((prev) =>
            prev.map((c) => {
              if (c.id !== activeConversation.id) return c;
              return {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === assistantMsgId
                    ? {
                        ...m,
                        isStreaming: false,
                        searchedWeb: data.searchedWeb || m.searchedWeb,
                        sources: data.sources || m.sources,
                      }
                    : m
                ),
              };
            })
          );
          setIsAskStreaming(false);
          fetchQuotaStats().then(setQuotaStats).catch(() => {});
        },
      },
      controller.signal
    );
  };

  const handleStopAskStreaming = () => {
    if (askAbortControllerRef.current) {
      askAbortControllerRef.current.abort();
      askAbortControllerRef.current = null;
    }
    setIsAskStreaming(false);
  };

  const handleNewConversation = () => {
    const newConv: Conversation = {
      id: `conv-${Date.now()}`,
      title: 'New Research Chat',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setConversations((prev) => [newConv, ...prev]);
    setActiveConvId(newConv.id);
  };

  const handleDeleteConversation = (id: string) => {
    setConversations((prev) => {
      const remaining = prev.filter((c) => c.id !== id);
      if (remaining.length === 0) {
        return [
          {
            id: `conv-${Date.now()}`,
            title: 'New Chat',
            messages: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        ];
      }
      return remaining;
    });
    if (activeConvId === id) {
      const next = conversations.find((c) => c.id !== id);
      if (next) setActiveConvId(next.id);
    }
  };

  const handleRenameConversation = (id: string, newTitle: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title: newTitle } : c))
    );
  };

  const handleDeleteAllUserData = () => {
    if (confirm('Are you sure you want to delete all cached files, checkpoints, and chat histories from your browser?')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0a0e17] text-slate-100 font-sans">
      {/* Top Navigation */}
      <Header
        mode={mode}
        onModeChange={(m) => {
          setMode(m);
          setActivePage('workspace');
        }}
        projectName={projectName}
        onProjectNameChange={setProjectName}
        onOpenBranding={() => setIsBrandingOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenTemplates={() => setIsTemplatesOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        onOpenMethodology={() => setActivePage('methodology')}
        onOpenAbout={() => setActivePage('about')}
        quotaStats={quotaStats}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < checkpoints.length - 1}
        onUndo={handleUndo}
        onRedo={handleRedo}
        checkpointsCount={checkpoints.length}
      />

      {/* Main View Router */}
      <div className="flex-1 overflow-hidden flex">
        {activePage === 'methodology' ? (
          <MethodologyPage onBack={() => setActivePage('workspace')} />
        ) : activePage === 'about' || activePage === 'terms' || activePage === 'privacy' ? (
          <LegalPages
            page={activePage}
            onBack={() => setActivePage('workspace')}
            onDeleteData={handleDeleteAllUserData}
          />
        ) : mode === 'build' ? (
          <StudioWorkspace
            files={files}
            onFilesChange={(newFiles) => {
              setFiles(newFiles);
              handleRunScan(newFiles);
            }}
            checkpoints={checkpoints}
            onGenerate={handleGenerate}
            onFixWithAI={handleFixWithAI}
            isGenerating={isGenerating}
            scanResults={scanResults}
            isScanning={isScanning}
            onTriggerScan={() => handleRunScan(files)}
            onOpenMethodology={() => setActivePage('methodology')}
            onOpenTemplates={() => setIsTemplatesOpen(true)}
          />
        ) : (
          <div className="flex-1 flex h-full overflow-hidden">
            <AskSidebar
              conversations={conversations}
              activeId={activeConvId}
              onSelect={setActiveConvId}
              onNewChat={handleNewConversation}
              onDelete={handleDeleteConversation}
              onRename={handleRenameConversation}
            />
            <AskChat
              messages={activeConversation?.messages || []}
              isStreaming={isAskStreaming}
              onSendMessage={handleAskSendMessage}
              onStopStreaming={handleStopAskStreaming}
              onRegenerate={() => {
                const msgs = activeConversation?.messages || [];
                const lastUser = [...msgs].reverse().find((m) => m.role === 'user');
                if (lastUser) {
                  handleAskSendMessage(lastUser.content);
                }
              }}
              onEditMessage={(_idx, newText) => {
                handleAskSendMessage(newText);
              }}
            />
          </div>
        )}
      </div>

      {/* Modals */}
      <BrandingCustomizerModal
        isOpen={isBrandingOpen}
        onClose={() => setIsBrandingOpen(false)}
        files={files}
        onApplyBranding={(brandedFiles) => {
          setFiles(brandedFiles);
          handleRunScan(brandedFiles);
        }}
      />

      <TemplateGalleryModal
        isOpen={isTemplatesOpen}
        onClose={() => setIsTemplatesOpen(false)}
        onSelectTemplate={handleSelectTemplate}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={setSettings}
      />

      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        projectName={projectName}
        files={files}
      />
    </div>
  );
}
