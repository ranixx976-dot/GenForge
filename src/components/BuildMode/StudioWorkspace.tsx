import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Send, 
  Paperclip, 
  FileCode, 
  RefreshCw, 
  Monitor, 
  Tablet, 
  Smartphone, 
  ShieldAlert, 
  Terminal, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  ExternalLink, 
  X,
  ChevronRight,
  Layers,
  Wrench
} from 'lucide-react';
import { ProjectFile, Checkpoint, FileScanResult, ConsoleLog } from '../../types/index.js';

interface StudioWorkspaceProps {
  files: ProjectFile[];
  onFilesChange: (files: ProjectFile[]) => void;
  checkpoints: Checkpoint[];
  onGenerate: (prompt: string, image?: { base64: string; mimeType: string }) => void;
  onFixWithAI: (errorMessage: string) => void;
  isGenerating: boolean;
  scanResults: FileScanResult[];
  isScanning: boolean;
  onTriggerScan: () => void;
  onOpenMethodology: () => void;
  onOpenTemplates: () => void;
}

export const StudioWorkspace: React.FC<StudioWorkspaceProps> = ({
  files,
  onFilesChange,
  checkpoints,
  onGenerate,
  onFixWithAI,
  isGenerating,
  scanResults,
  isScanning,
  onTriggerScan,
  onOpenMethodology,
  onOpenTemplates,
}) => {
  // Panel state
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [rightTab, setRightTab] = useState<'preview' | 'scan' | 'console'>('preview');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [promptInput, setPromptInput] = useState('');
  const [selectedImage, setSelectedImage] = useState<{ base64: string; mimeType: string; previewUrl: string } | null>(null);
  
  // Console logs captured from iframe
  const [consoleLogs, setConsoleLogs] = useState<ConsoleLog[]>([]);
  const [highlightedLine, setHighlightedLine] = useState<number | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Active file
  const activeFile = files[activeFileIndex] || files[0];

  // Listen to postMessage from sandboxed iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'GENFORGE_CONSOLE') {
        const newLog: ConsoleLog = {
          id: `log-${Date.now()}-${Math.random()}`,
          type: event.data.level || 'log',
          message: event.data.args?.join(' ') || 'Log entry',
          timestamp: Date.now(),
        };
        setConsoleLogs((prev) => [...prev.slice(-99), newLog]);
      } else if (event.data && event.data.type === 'GENFORGE_RUNTIME_ERROR') {
        const errorLog: ConsoleLog = {
          id: `err-${Date.now()}`,
          type: 'error',
          message: event.data.message || 'Unhandled runtime exception',
          timestamp: Date.now(),
        };
        setConsoleLogs((prev) => [...prev.slice(-99), errorLog]);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Construct bundled sandboxed HTML for iframe preview
  const buildPreviewSrcDoc = () => {
    if (!files || files.length === 0) return '';

    const htmlFile = files.find((f) => f.path.endsWith('.html')) || files[0];
    const cssFiles = files.filter((f) => f.path.endsWith('.css'));
    const jsFiles = files.filter((f) => f.path.endsWith('.js') || f.path.endsWith('.ts'));

    let htmlContent = htmlFile?.content || '<html><body></body></html>';

    // Inject console capture bridge script
    const bridgeScript = `
      <script>
        (function() {
          const sendLog = (level, args) => {
            try {
              window.parent.postMessage({
                type: 'GENFORGE_CONSOLE',
                level: level,
                args: Array.from(args).map(a => typeof a === 'object' ? JSON.stringify(a) : String(a))
              }, '*');
            } catch (e) {}
          };
          const origLog = console.log;
          const origWarn = console.warn;
          const origError = console.error;
          console.log = function(...args) { origLog.apply(console, args); sendLog('log', args); };
          console.warn = function(...args) { origWarn.apply(console, args); sendLog('warn', args); };
          console.error = function(...args) { origError.apply(console, args); sendLog('error', args); };
          window.onerror = function(msg, url, line, col, err) {
            window.parent.postMessage({
              type: 'GENFORGE_RUNTIME_ERROR',
              message: String(msg) + ' (line ' + line + ')'
            }, '*');
          };
        })();
      </script>
    `;

    // Inject CSS
    const injectedStyles = cssFiles.map((c) => `<style data-file="${c.path}">${c.content}</style>`).join('\n');

    // Inject JS
    const injectedScripts = jsFiles.map((j) => `<script data-file="${j.path}">${j.content}</script>`).join('\n');

    if (htmlContent.includes('<head>')) {
      htmlContent = htmlContent.replace('<head>', `<head>${bridgeScript}${injectedStyles}`);
    } else {
      htmlContent = `${bridgeScript}${injectedStyles}${htmlContent}`;
    }

    if (htmlContent.includes('</body>')) {
      htmlContent = htmlContent.replace('</body>', `${injectedScripts}</body>`);
    } else {
      htmlContent = `${htmlContent}${injectedScripts}`;
    }

    return htmlContent;
  };

  const handleRefreshPreview = () => {
    if (iframeRef.current) {
      iframeRef.current.srcdoc = buildPreviewSrcDoc();
    }
  };

  // Image upload handler
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid PNG or JPEG image.');
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      alert('Image size exceeds 4MB limit.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImage({
        base64: reader.result as string,
        mimeType: file.type,
        previewUrl: URL.createObjectURL(file),
      });
    };
    reader.readAsDataURL(file);
  };

  const handleFileContentChange = (newContent: string) => {
    if (!activeFile) return;
    const updated = files.map((f, idx) =>
      idx === activeFileIndex ? { ...f, content: newContent } : f
    );
    onFilesChange(updated);
  };

  const handlePromptSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!promptInput.trim() || isGenerating) return;
    onGenerate(promptInput.trim(), selectedImage ? { base64: selectedImage.base64, mimeType: selectedImage.mimeType } : undefined);
    setPromptInput('');
    setSelectedImage(null);
  };

  const handleJumpToFinding = (filePath: string, line: number) => {
    const targetIdx = files.findIndex((f) => f.path === filePath);
    if (targetIdx !== -1) {
      setActiveFileIndex(targetIdx);
      setHighlightedLine(line);
      // scroll textarea if possible
      setTimeout(() => {
        if (editorTextareaRef.current) {
          const lines = (files[targetIdx]?.content || '').split('\n');
          const charPos = lines.slice(0, line - 1).join('\n').length;
          editorTextareaRef.current.setSelectionRange(charPos, charPos);
          editorTextareaRef.current.focus();
        }
      }, 100);
    }
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden bg-[#0a0e17] text-slate-100 select-none">
      {/* ========================================================================= */}
      {/* LEFT PANEL: Chat Prompt History & Follow-Up Input */}
      {/* ========================================================================= */}
      <div className="w-full md:w-80 lg:w-96 border-r border-slate-800 bg-[#0d131f] flex flex-col h-full flex-shrink-0">
        <div className="p-3 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Build History</span>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">
            {checkpoints.length} checkpoint{checkpoints.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* History Checkpoint Feed */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {checkpoints.length === 0 ? (
            <div className="py-10 text-center space-y-3 px-2">
              <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-800/60 text-cyan-400 mx-auto flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white">Ready to Build</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Describe any web application. GenForge creates real code, sandboxed preview, and performs CodeBERT vulnerability cross-checks.
              </p>
              <button
                onClick={onOpenTemplates}
                className="mt-2 text-xs text-cyan-400 hover:text-cyan-300 underline font-medium"
              >
                Or pick an example starter template
              </button>
            </div>
          ) : (
            checkpoints.map((cp, idx) => (
              <div
                key={cp.id}
                className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs space-y-1.5 shadow-sm hover:border-slate-700 transition"
              >
                <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono">
                  <span>v{idx + 1}</span>
                  <span>{new Date(cp.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="font-semibold text-slate-200 line-clamp-2">"{cp.prompt}"</div>
                {cp.summary && (
                  <p className="text-[11px] text-slate-400 line-clamp-3 leading-relaxed">{cp.summary}</p>
                )}
              </div>
            ))
          )}
        </div>

        {/* Prompt Input Form */}
        <div className="p-3 border-t border-slate-800/80 bg-[#0d131f] space-y-2">
          {selectedImage && (
            <div className="relative inline-block border border-slate-700 rounded-lg overflow-hidden">
              <img src={selectedImage.previewUrl} alt="Attached sketch" className="h-14 w-auto object-cover" />
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute top-1 right-1 p-0.5 rounded-full bg-slate-950/80 text-white hover:text-rose-400"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          <form onSubmit={handlePromptSubmit} className="space-y-2">
            <textarea
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handlePromptSubmit();
                }
              }}
              placeholder={files.length === 0 ? "Describe the app you want to build..." : "Follow-up prompt (e.g. 'Add dark mode toggle and sound effect')..."}
              className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 outline-none resize-none min-h-[64px]"
              rows={2}
            />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/png,image/jpeg"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-cyan-400 transition"
                  title="Upload UI screenshot or wireframe"
                >
                  <Paperclip className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                type="submit"
                disabled={!promptInput.trim() || isGenerating}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 font-bold text-xs transition shadow-sm"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Forging...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>{files.length === 0 ? 'Generate' : 'Update'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MIDDLE PANEL: File Tree & Code Editor */}
      {/* ========================================================================= */}
      <div className="w-full md:w-1/2 flex flex-col h-full border-r border-slate-800 bg-[#090d16]">
        {/* File Tabs */}
        <div className="h-10 border-b border-slate-800 bg-[#0d131f] flex items-center px-2 overflow-x-auto gap-1">
          {files.map((file, idx) => {
            const isActive = idx === activeFileIndex;
            return (
              <button
                key={file.path}
                onClick={() => {
                  setActiveFileIndex(idx);
                  setHighlightedLine(null);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg text-xs font-mono transition ${
                  isActive
                    ? 'bg-[#090d16] text-cyan-300 border-t-2 border-cyan-500 font-semibold'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                }`}
              >
                <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                <span>{file.path}</span>
              </button>
            );
          })}
        </div>

        {/* Code Editor Body */}
        <div className="flex-1 relative flex overflow-hidden font-mono text-xs">
          {activeFile ? (
            <div className="w-full h-full flex flex-col">
              {highlightedLine && (
                <div className="px-3 py-1 bg-amber-500/10 border-b border-amber-500/30 text-amber-300 text-[11px] flex justify-between items-center">
                  <span>Targeted Finding on line {highlightedLine}</span>
                  <button onClick={() => setHighlightedLine(null)} className="hover:text-white">✕</button>
                </div>
              )}
              <textarea
                ref={editorTextareaRef}
                value={activeFile.content}
                onChange={(e) => handleFileContentChange(e.target.value)}
                spellCheck={false}
                className="flex-1 w-full p-4 bg-transparent text-slate-200 resize-none outline-none font-mono leading-relaxed"
              />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500 text-xs">
              No files in workspace. Click Generate or select a template to load code.
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* RIGHT PANEL: Preview | Scan | Console Tabs */}
      {/* ========================================================================= */}
      <div className="w-full md:w-1/2 flex flex-col h-full bg-[#0a0e17]">
        {/* Right Top Bar */}
        <div className="h-10 border-b border-slate-800 bg-[#0d131f] flex items-center justify-between px-3">
          {/* Tab selection */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setRightTab('preview')}
              className={`flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium transition ${
                rightTab === 'preview'
                  ? 'bg-slate-800 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Play className="w-3 h-3 text-emerald-400" />
              <span>Preview</span>
            </button>

            <button
              onClick={() => {
                setRightTab('scan');
                onTriggerScan();
              }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition ${
                rightTab === 'scan'
                  ? 'bg-slate-800 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldAlert className="w-3 h-3 text-cyan-400" />
              <span>Scan</span>
              {scanResults.some((r) => r.patternFindings.length > 0 || r.modelPrediction.riskScore > 0.5) && (
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              )}
            </button>

            <button
              onClick={() => setRightTab('console')}
              className={`flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium transition ${
                rightTab === 'console'
                  ? 'bg-slate-800 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Terminal className="w-3 h-3 text-amber-400" />
              <span>Console</span>
              {consoleLogs.some((l) => l.type === 'error') && (
                <span className="w-2 h-2 rounded-full bg-rose-500" />
              )}
            </button>
          </div>

          {/* Tab Specific Controls */}
          {rightTab === 'preview' && (
            <div className="flex items-center gap-1.5">
              <div className="flex items-center bg-slate-900 rounded-lg p-0.5 border border-slate-800 text-slate-400">
                <button
                  onClick={() => setPreviewDevice('desktop')}
                  className={`p-1 rounded ${previewDevice === 'desktop' ? 'bg-slate-800 text-cyan-400' : 'hover:text-white'}`}
                  title="Desktop View (100%)"
                >
                  <Monitor className="w-3 h-3" />
                </button>
                <button
                  onClick={() => setPreviewDevice('tablet')}
                  className={`p-1 rounded ${previewDevice === 'tablet' ? 'bg-slate-800 text-cyan-400' : 'hover:text-white'}`}
                  title="Tablet View (768px)"
                >
                  <Tablet className="w-3 h-3" />
                </button>
                <button
                  onClick={() => setPreviewDevice('mobile')}
                  className={`p-1 rounded ${previewDevice === 'mobile' ? 'bg-slate-800 text-cyan-400' : 'hover:text-white'}`}
                  title="Mobile View (375px)"
                >
                  <Smartphone className="w-3 h-3" />
                </button>
              </div>

              <button
                onClick={handleRefreshPreview}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
                title="Refresh preview"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-hidden relative">
          {/* 1. PREVIEW TAB */}
          {rightTab === 'preview' && (
            <div className="w-full h-full flex items-center justify-center bg-slate-950 p-2 overflow-auto">
              <div
                className={`h-full transition-all duration-300 rounded-xl overflow-hidden border border-slate-800 shadow-2xl bg-white ${
                  previewDevice === 'mobile'
                    ? 'w-[375px]'
                    : previewDevice === 'tablet'
                    ? 'w-[768px]'
                    : 'w-full'
                }`}
              >
                <iframe
                  ref={iframeRef}
                  title="GenForge Live Sandboxed Preview"
                  sandbox="allow-scripts"
                  srcDoc={buildPreviewSrcDoc()}
                  className="w-full h-full border-0"
                />
              </div>
            </div>
          )}

          {/* 2. SCAN TAB: DUAL SIGNALS */}
          {rightTab === 'scan' && (
            <div className="w-full h-full overflow-y-auto p-4 space-y-4">
              {/* Honest Disclaimer Banner */}
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-cyan-400 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-cyan-400" />
                    Dual-Signal Vulnerability Review
                  </span>
                  <button
                    onClick={onOpenMethodology}
                    className="text-[11px] text-slate-400 hover:text-cyan-300 flex items-center gap-1 underline"
                  >
                    Methodology & Metrics
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  "A second opinion, not a certificate of safety." The neural CodeBERT model was trained on C CVE benchmarks; JavaScript and Python inferences rely on syntactic transfer.
                </p>
              </div>

              {isScanning && (
                <div className="flex items-center gap-2 p-3 bg-cyan-950/40 border border-cyan-800/40 rounded-xl text-xs text-cyan-300">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Scanning files with CodeBERT model & AST pattern bank...</span>
                </div>
              )}

              {/* Per-File Findings */}
              {scanResults.map((result) => {
                const { modelPrediction, patternFindings, path } = result;
                const isHighRisk = modelPrediction.riskScore > 0.5;

                return (
                  <div
                    key={path}
                    className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3"
                  >
                    <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                      <span className="font-mono text-xs font-bold text-white flex items-center gap-1.5">
                        <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                        {path}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        Hash: {result.contentHash.slice(0, 8)}
                      </span>
                    </div>

                    {/* Dual Signals Side by Side */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Signal 1: Neural Model Prediction */}
                      <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1.5">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          Signal 1: Model Prediction
                        </span>
                        <div className="flex items-baseline gap-2">
                          <span
                            className={`text-xl font-bold font-mono ${
                              isHighRisk ? 'text-rose-400' : 'text-emerald-400'
                            }`}
                          >
                            {(modelPrediction.riskScore * 100).toFixed(0)}% Risk
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              isHighRisk
                                ? 'bg-rose-500/20 text-rose-300'
                                : 'bg-emerald-500/20 text-emerald-300'
                            }`}
                          >
                            {modelPrediction.label}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500">
                          Confidence: {(modelPrediction.confidence * 100).toFixed(0)}%{' '}
                          {modelPrediction.statusMessage ? `(${modelPrediction.statusMessage})` : ''}
                        </p>
                      </div>

                      {/* Signal 2: Deterministic Pattern Cross-Check */}
                      <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1.5">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          Signal 2: Pattern Cross-Check
                        </span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-xl font-bold font-mono text-white">
                            {patternFindings.length}
                          </span>
                          <span className="text-xs text-slate-400">
                            issue{patternFindings.length !== 1 ? 's' : ''} detected
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500">
                          Checks CWE-79 (XSS), CWE-95 (eval), CWE-798 (Secrets), CWE-89
                        </p>
                      </div>
                    </div>

                    {/* Findings list */}
                    {patternFindings.length > 0 ? (
                      <div className="space-y-2 pt-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Pattern Match Details:
                        </span>
                        {patternFindings.map((finding) => (
                          <div
                            key={finding.id}
                            className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs space-y-1.5 hover:border-slate-700 transition"
                          >
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-slate-200">
                                {finding.rule} ({finding.cwe})
                              </span>
                              <div className="flex items-center gap-2">
                                <span
                                  className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                    finding.severity === 'CRITICAL'
                                      ? 'bg-rose-500/20 text-rose-400'
                                      : 'bg-amber-500/20 text-amber-400'
                                  }`}
                                >
                                  {finding.severity}
                                </span>
                                <button
                                  onClick={() => handleJumpToFinding(path, finding.line)}
                                  className="text-[11px] font-mono text-cyan-400 hover:underline px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800"
                                >
                                  Jump to Line {finding.line}
                                </button>
                              </div>
                            </div>
                            <div className="font-mono text-[11px] p-1.5 bg-slate-900 rounded text-slate-300 truncate">
                              Line {finding.line}: {finding.snippet}
                            </div>
                            <p className="text-[11px] text-slate-400">{finding.message}</p>
                            <p className="text-[11px] text-emerald-400 font-medium">
                              💡 Fix: {finding.recommendation}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-emerald-400 pt-1">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>No deterministic pattern vulnerabilities found in this file.</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* 3. CONSOLE TAB */}
          {rightTab === 'console' && (
            <div className="w-full h-full flex flex-col bg-[#080c14] font-mono text-xs">
              <div className="p-2 border-b border-slate-800 flex justify-between items-center text-slate-400">
                <span>Captured Sandbox Logs ({consoleLogs.length})</span>
                <button
                  onClick={() => setConsoleLogs([])}
                  className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-[11px] text-slate-400 hover:text-white"
                >
                  Clear Console
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {consoleLogs.length === 0 ? (
                  <div className="text-slate-500 text-center py-10">
                    No console logs or errors captured from preview.
                  </div>
                ) : (
                  consoleLogs.map((log) => {
                    const isError = log.type === 'error';
                    const isWarn = log.type === 'warn';

                    return (
                      <div
                        key={log.id}
                        className={`p-2 rounded border flex flex-col gap-1 ${
                          isError
                            ? 'bg-rose-950/30 border-rose-900/60 text-rose-300'
                            : isWarn
                            ? 'bg-amber-950/30 border-amber-900/60 text-amber-300'
                            : 'bg-slate-900/60 border-slate-800 text-slate-300'
                        }`}
                      >
                        <div className="flex justify-between items-center text-[10px] text-slate-500">
                          <span>[{log.type.toUpperCase()}]</span>
                          <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <div className="whitespace-pre-wrap font-mono">{log.message}</div>
                        {isError && (
                          <div className="pt-1 flex justify-end">
                            <button
                              onClick={() => onFixWithAI(log.message)}
                              className="flex items-center gap-1 px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-sans text-xs font-semibold shadow-sm transition"
                            >
                              <Wrench className="w-3 h-3" />
                              <span>Fix with AI</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
