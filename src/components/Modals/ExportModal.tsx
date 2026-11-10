import React, { useState } from 'react';
import { X, Download, Copy, Check, Rocket, ExternalLink, RefreshCw } from 'lucide-react';
import JSZip from 'jszip';
import { ProjectFile } from '../../types/index.js';
import { deployToVercel } from '../../services/api.js';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
  files: ProjectFile[];
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  projectName,
  files,
}) => {
  const [copiedFile, setCopiedFile] = useState<string | null>(null);
  const [vercelToken, setVercelToken] = useState('');
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployResult, setDeployResult] = useState<{ url?: string; dashboardUrl?: string; error?: string } | null>(null);

  if (!isOpen) return null;

  const handleCopyFile = (file: ProjectFile) => {
    navigator.clipboard.writeText(file.content);
    setCopiedFile(file.path);
    setTimeout(() => setCopiedFile(null), 2000);
  };

  const handleDownloadZip = async () => {
    const zip = new JSZip();
    files.forEach((file) => {
      zip.file(file.path, file.content);
    });

    // Add a generated README
    zip.file(
      'README.md',
      `# ${projectName}\n\nGenerated with GenForge AI Web Studio & Scanner.\n\n## Quick Start\nOpen \`index.html\` in any modern browser or host on any static provider (Vercel, GitHub Pages, Netlify).\n`
    );

    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName.toLowerCase().replace(/[^a-z0-9_-]/g, '-')}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDeploy = async () => {
    setIsDeploying(true);
    setDeployResult(null);

    try {
      const res = await deployToVercel({
        projectName,
        files,
        vercelToken: vercelToken.trim() || undefined,
      });

      if (res.success && res.deploymentUrl) {
        setDeployResult({ url: res.deploymentUrl, dashboardUrl: res.dashboardUrl });
      } else {
        setDeployResult({ error: res.message || res.error || 'Deployment failed.' });
      }
    } catch (err: any) {
      setDeployResult({ error: err.message || 'Deployment error' });
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl rounded-2xl bg-[#0d131f] border border-slate-800 p-6 shadow-2xl space-y-6">
        <div className="flex justify-between items-center border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-white">Export & Deploy Project</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. ZIP Download */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex justify-between items-center">
          <div>
            <h3 className="text-sm font-bold text-white">Download Project ZIP</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Includes all {files.length} project files ready for local execution or static hosting.
            </p>
          </div>
          <button
            onClick={handleDownloadZip}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>Download ZIP</span>
          </button>
        </div>

        {/* 2. Copy per file */}
        <div className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
            Copy Individual Files
          </span>
          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
            {files.map((f) => (
              <div
                key={f.path}
                className="flex justify-between items-center p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 text-xs"
              >
                <span className="font-mono text-slate-300">{f.path}</span>
                <button
                  onClick={() => handleCopyFile(f)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                >
                  {copiedFile === f.path ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Code</span>
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* 3. One-Click Vercel Deploy */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center gap-2">
            <Rocket className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white">1-Click Vercel Deploy</h3>
          </div>
          <p className="text-xs text-slate-400">
            Deploy directly to production on Vercel edge networks. Provide your personal Vercel Token or use the environment token if configured.
          </p>

          <div className="flex gap-2">
            <input
              type="password"
              value={vercelToken}
              onChange={(e) => setVercelToken(e.target.value)}
              placeholder="Paste Vercel Access Token (optional if set in env)"
              className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none focus:border-cyan-500 font-mono"
            />
            <button
              onClick={handleDeploy}
              disabled={isDeploying}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition border border-slate-700"
            >
              {isDeploying ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Deploying...</span>
                </>
              ) : (
                <>
                  <Rocket className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Deploy</span>
                </>
              )}
            </button>
          </div>

          {deployResult && (
            <div className={`p-3 rounded-lg text-xs ${deployResult.error ? 'bg-rose-950/40 text-rose-300 border border-rose-800' : 'bg-emerald-950/40 text-emerald-300 border border-emerald-800'}`}>
              {deployResult.error ? (
                <div>{deployResult.error}</div>
              ) : (
                <div className="flex justify-between items-center">
                  <span>🚀 Live on Vercel:</span>
                  <a
                    href={deployResult.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold underline flex items-center gap-1"
                  >
                    {deployResult.url}
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
