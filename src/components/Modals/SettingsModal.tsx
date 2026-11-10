import React from 'react';
import { X, Settings, RotateCcw } from 'lucide-react';
import { RunSettings } from '../../types/index.js';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: RunSettings;
  onUpdateSettings: (settings: RunSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}) => {
  if (!isOpen) return null;

  const handleReset = () => {
    onUpdateSettings({
      model: 'gemini-3.8-flash',
      temperature: 0.3,
      maxTokens: 4096,
      systemInstruction: '',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl bg-[#0d131f] border border-slate-800 p-6 shadow-2xl space-y-6">
        <div className="flex justify-between items-center border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-slate-400" />
            <h2 className="text-base font-bold text-white">Project Run Settings</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Model Selection */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            LLM Model Architecture
          </label>
          <select
            value={settings.model}
            onChange={(e) => onUpdateSettings({ ...settings, model: e.target.value })}
            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 focus:border-cyan-500 text-xs text-white outline-none font-mono"
          >
            <option value="gemini-3.8-flash">gemini-3.8-flash (Fast, Low Latency, Default)</option>
            <option value="gemini-2.5-pro">gemini-2.5-pro (Deep Reasoning & Complex Code)</option>
            <option value="custom">Configured via LLM_MODEL in .env</option>
          </select>
        </div>

        {/* Temperature Slider */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <label className="font-semibold uppercase tracking-wider text-slate-400">
              Inference Temperature
            </label>
            <span className="font-mono text-cyan-400 font-bold">{settings.temperature.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={settings.temperature}
            onChange={(e) => onUpdateSettings({ ...settings, temperature: parseFloat(e.target.value) })}
            className="w-full accent-cyan-500 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>0.0 (Deterministic / Exact)</span>
            <span>1.0 (Creative)</span>
          </div>
        </div>

        {/* Max Tokens */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Max Generation Tokens
          </label>
          <input
            type="number"
            min="512"
            max="8192"
            step="512"
            value={settings.maxTokens}
            onChange={(e) => onUpdateSettings({ ...settings, maxTokens: parseInt(e.target.value, 10) || 4096 })}
            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 focus:border-cyan-500 text-xs text-white outline-none font-mono"
          />
        </div>

        {/* Custom System Instruction */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Custom System Directives
          </label>
          <textarea
            value={settings.systemInstruction}
            onChange={(e) => onUpdateSettings({ ...settings, systemInstruction: e.target.value })}
            placeholder="Override or augment default system prompts for custom coding style, CSS framework preferences, etc."
            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 focus:border-cyan-500 text-xs text-white outline-none resize-none min-h-[80px]"
            rows={3}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center pt-4 border-t border-slate-800">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Defaults</span>
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition shadow-sm"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};
