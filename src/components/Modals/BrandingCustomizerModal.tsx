import React, { useState } from 'react';
import { X, Palette, Check } from 'lucide-react';
import { ProjectFile } from '../../types/index.js';

interface BrandingCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  files: ProjectFile[];
  onApplyBranding: (updatedFiles: ProjectFile[]) => void;
}

const PALETTE_PRESETS = [
  { name: 'Midnight Cyan', primary: '#06b6d4', bg: '#0b0f17', accent: '#3b82f6' },
  { name: 'Emerald Forge', primary: '#10b981', bg: '#061a14', accent: '#059669' },
  { name: 'Cyber Violet', primary: '#8b5cf6', bg: '#100b1a', accent: '#ec4899' },
  { name: 'Sunset Amber', primary: '#f59e0b', bg: '#1c130b', accent: '#ef4444' },
  { name: 'Carbon High-Contrast', primary: '#ffffff', bg: '#000000', accent: '#71717a' },
];

const FONT_PAIRS = [
  { name: 'Inter + JetBrains Mono', heading: 'Inter, sans-serif', body: 'Inter, sans-serif', mono: 'JetBrains Mono, monospace' },
  { name: 'Syne + Space Mono', heading: 'Syne, sans-serif', body: 'Space Grotesk, sans-serif', mono: 'Space Mono, monospace' },
  { name: 'Plus Jakarta + Fira Code', heading: 'Plus Jakarta Sans, sans-serif', body: 'Plus Jakarta Sans, sans-serif', mono: 'Fira Code, monospace' },
];

export const BrandingCustomizerModal: React.FC<BrandingCustomizerModalProps> = ({
  isOpen,
  onClose,
  files,
  onApplyBranding,
}) => {
  const [appName, setAppName] = useState('My Custom App');
  const [selectedPalette, setSelectedPalette] = useState(PALETTE_PRESETS[0]);
  const [customPrimary, setCustomPrimary] = useState('#06b6d4');
  const [selectedFont, setSelectedFont] = useState(FONT_PAIRS[0]);

  if (!isOpen) return null;

  const handleApply = () => {
    // Directly inject branding theme tokens into generated index.html or style.css without regenerating!
    const primaryColor = customPrimary || selectedPalette.primary;

    const themeSnippet = `
/* GenForge Custom Branding Tokens */
:root {
  --gf-primary: ${primaryColor};
  --gf-bg: ${selectedPalette.bg};
  --gf-accent: ${selectedPalette.accent};
  --font-heading: ${selectedFont.heading};
  --font-body: ${selectedFont.body};
}
`;

    const updated = files.map((file) => {
      if (file.path.endsWith('.css')) {
        // Prepend theme tokens if not already present
        const cleaned = file.content.replace(/\/\* GenForge Custom Branding Tokens \*\/[\s\S]*?}/g, '');
        return {
          ...file,
          content: `${themeSnippet.trim()}\n\n${cleaned.trim()}`,
        };
      }
      if (file.path.endsWith('.html')) {
        let content = file.content;
        // Update Title if present
        if (appName.trim()) {
          content = content.replace(/<title>.*?<\/title>/i, `<title>${appName.trim()}</title>`);
        }
        return { ...file, content };
      }
      return file;
    });

    onApplyBranding(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl bg-[#0d131f] border border-slate-800 p-6 shadow-2xl space-y-6">
        <div className="flex justify-between items-center border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-bold text-white">Project Branding Customizer</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. App Name */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Application Title
          </label>
          <input
            type="text"
            value={appName}
            onChange={(e) => setAppName(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 focus:border-cyan-500 text-sm text-white outline-none"
            placeholder="e.g. Apex Dashboard"
          />
        </div>

        {/* 2. Color Palettes */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Color Palette Preset
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PALETTE_PRESETS.map((p) => {
              const isSelected = selectedPalette.name === p.name;
              return (
                <button
                  key={p.name}
                  onClick={() => {
                    setSelectedPalette(p);
                    setCustomPrimary(p.primary);
                  }}
                  className={`p-2.5 rounded-xl border text-left flex items-center justify-between text-xs transition ${
                    isSelected
                      ? 'bg-slate-800 border-cyan-500 text-white'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-4 h-4 rounded-full border border-slate-700"
                      style={{ backgroundColor: p.primary }}
                    />
                    <span className="font-medium text-slate-200">{p.name}</span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3 pt-2">
            <span className="text-xs text-slate-400">Custom Primary Hex:</span>
            <input
              type="color"
              value={customPrimary}
              onChange={(e) => setCustomPrimary(e.target.value)}
              className="w-8 h-8 rounded border border-slate-700 bg-transparent cursor-pointer"
            />
            <span className="text-xs font-mono text-slate-300">{customPrimary}</span>
          </div>
        </div>

        {/* 3. Font Pairings */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Font Pairing
          </label>
          <div className="space-y-1.5">
            {FONT_PAIRS.map((f) => {
              const isSelected = selectedFont.name === f.name;
              return (
                <button
                  key={f.name}
                  onClick={() => setSelectedFont(f)}
                  className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between text-xs transition ${
                    isSelected
                      ? 'bg-slate-800 border-cyan-500 text-white font-medium'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <span>{f.name}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition shadow-sm"
          >
            Apply Theme Directly
          </button>
        </div>
      </div>
    </div>
  );
};
