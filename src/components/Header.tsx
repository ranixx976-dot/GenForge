import React from 'react';
import { 
  Sparkles, 
  Terminal, 
  Settings, 
  Download, 
  Palette, 
  LayoutTemplate, 
  ShieldCheck, 
  RotateCcw,
  BookOpen,
  Info
} from 'lucide-react';
import { QuotaStats } from '../types/index.js';

interface HeaderProps {
  mode: 'ask' | 'build';
  onModeChange: (mode: 'ask' | 'build') => void;
  projectName: string;
  onProjectNameChange: (name: string) => void;
  onOpenBranding: () => void;
  onOpenSettings: () => void;
  onOpenTemplates: () => void;
  onOpenExport: () => void;
  onOpenMethodology: () => void;
  onOpenAbout: () => void;
  quotaStats: QuotaStats | null;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  checkpointsCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  mode,
  onModeChange,
  projectName,
  onProjectNameChange,
  onOpenBranding,
  onOpenSettings,
  onOpenTemplates,
  onOpenExport,
  onOpenMethodology,
  onOpenAbout,
  quotaStats,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  checkpointsCount = 0,
}) => {
  return (
    <header className="h-14 border-b border-slate-800 bg-[#0d131f] px-4 flex items-center justify-between select-none z-40 sticky top-0">
      {/* Left: Brand & Mode Switcher */}
      <div className="flex items-center gap-4">
        <div 
          onClick={onOpenAbout}
          className="flex items-center gap-2.5 cursor-pointer hover:opacity-90 transition group"
          title="About GenForge"
        >
          <img 
            src="/genforge-logo.svg" 
            alt="GenForge Logo" 
            className="w-7 h-7 transform group-hover:scale-105 transition" 
          />
          <div className="flex items-baseline gap-1.5">
            <span className="font-extrabold text-base tracking-tight text-white font-mono">GenForge</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-cyan-400 bg-cyan-950/70 border border-cyan-800/60 px-1.5 py-0.2 rounded">
              Dual-Mode
            </span>
          </div>
        </div>

        {/* Mode Switch (Ask | Build) */}
        <div className="flex items-center bg-slate-900/90 p-0.5 rounded-lg border border-slate-800">
          <button
            onClick={() => onModeChange('build')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition ${
              mode === 'build'
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Build</span>
          </button>
          <button
            onClick={() => onModeChange('ask')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition ${
              mode === 'ask'
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ask</span>
          </button>
        </div>

        {/* Project Name Editor in Build mode */}
        {mode === 'build' && (
          <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-800 text-xs">
            <input
              type="text"
              value={projectName}
              onChange={(e) => onProjectNameChange(e.target.value)}
              className="bg-transparent hover:bg-slate-800/50 focus:bg-slate-800 px-2 py-1 rounded border border-transparent focus:border-slate-700 text-slate-200 font-medium outline-none transition w-36 md:w-48 truncate"
              placeholder="Project Name"
            />
            {checkpointsCount > 0 && (
              <span className="text-[11px] text-slate-500 font-mono">
                v{checkpointsCount}
              </span>
            )}
            {/* Undo / Redo */}
            <div className="flex items-center gap-0.5 ml-1">
              <button
                disabled={!canUndo}
                onClick={onUndo}
                className="p-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 transition"
                title="Undo (Ctrl+Z)"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2">
        {mode === 'build' && (
          <>
            {/* Template Gallery */}
            <button
              onClick={onOpenTemplates}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-medium transition"
              title="Starter Templates"
            >
              <LayoutTemplate className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden md:inline">Templates</span>
            </button>

            {/* Branding Customizer */}
            <button
              onClick={onOpenBranding}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-medium transition"
              title="Branding Customizer"
            >
              <Palette className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden md:inline">Branding</span>
            </button>

            {/* Run Settings */}
            <button
              onClick={onOpenSettings}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-medium transition"
              title="Run & Model Settings"
            >
              <Settings className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden lg:inline">Settings</span>
            </button>

            {/* Export */}
            <button
              onClick={onOpenExport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition border border-slate-700 shadow-sm"
              title="Export Zip or Deploy"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Export</span>
            </button>
          </>
        )}

        {/* Methodology Link */}
        <button
          onClick={onOpenMethodology}
          className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-slate-400 hover:text-cyan-400 text-xs transition"
          title="CodeBERT Scanner Methodology"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden xl:inline">Methodology</span>
        </button>

        {/* Quota Badge */}
        {quotaStats && (
          <div 
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] text-slate-400 font-mono"
            title={`Remaining Daily Quota: ${quotaStats.remainingDailyQuota} / ${quotaStats.dailyGlobalCap}`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>{quotaStats.remainingDailyQuota} quota</span>
          </div>
        )}
      </div>
    </header>
  );
};
