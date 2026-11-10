import React, { useState } from 'react';
import { X, LayoutTemplate, ShieldAlert, CheckCircle2, ArrowRight } from 'lucide-react';
import { TEMPLATES, TemplateProject } from '../../data/templates.js';
import { ProjectFile } from '../../types/index.js';

interface TemplateGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: TemplateProject) => void;
}

export const TemplateGalleryModal: React.FC<TemplateGalleryModalProps> = ({
  isOpen,
  onClose,
  onSelectTemplate,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  if (!isOpen) return null;

  const categories = ['All', 'Productivity', 'Finance / Business', 'Marketing', 'Portfolio', 'Dashboard', 'Security Testing'];

  const filtered = selectedCategory === 'All'
    ? TEMPLATES
    : TEMPLATES.filter((t) => t.category === selectedCategory);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl max-h-[90vh] rounded-2xl bg-[#0d131f] border border-slate-800 p-6 shadow-2xl flex flex-col space-y-6">
        <div className="flex justify-between items-center border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <LayoutTemplate className="w-5 h-5 text-cyan-400" />
            <div>
              <h2 className="text-base font-bold text-white">Example Starters & Test Gallery</h2>
              <p className="text-xs text-slate-400">8 production templates + 1 intentionally vulnerable CodeBERT scanner demo.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-1 text-xs">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition ${
                selectedCategory === cat
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Gallery Grid */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-4 pr-1">
          {filtered.map((t) => {
            const isUnsafe = t.isUnsafeSample;

            return (
              <div
                key={t.id}
                className={`p-4 rounded-xl border flex flex-col justify-between transition group hover:shadow-lg ${
                  isUnsafe
                    ? 'bg-rose-950/20 border-rose-500/40 hover:border-rose-500'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <span className="font-bold text-sm text-white group-hover:text-cyan-300 transition">
                      {t.name}
                    </span>
                    {t.badge ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                        <ShieldAlert className="w-3 h-3 text-rose-400" />
                        {t.badge}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-400">
                        {t.category}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed mb-4">
                    {t.description}
                  </p>
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-slate-800/80 text-xs">
                  <span className="text-[11px] text-slate-500 font-mono">
                    {t.files.length} file{t.files.length !== 1 ? 's' : ''}
                  </span>
                  <button
                    onClick={() => {
                      onSelectTemplate(t);
                      onClose();
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-xs transition ${
                      isUnsafe
                        ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/30'
                        : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-cyan-900/30'
                    }`}
                  >
                    <span>Load Template</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
