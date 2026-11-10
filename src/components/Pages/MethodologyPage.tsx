import React from 'react';
import { ArrowLeft, ShieldCheck, AlertTriangle, Database, Activity, BarChart2 } from 'lucide-react';
import metricsData from '../../data/metrics.json';

interface MethodologyPageProps {
  onBack: () => void;
}

export const MethodologyPage: React.FC<MethodologyPageProps> = ({ onBack }) => {
  const { metrics, confusion_matrix, per_vulnerability_type, limitations } = metricsData;

  return (
    <div className="min-h-screen bg-[#0a0e17] text-slate-100 p-6 md:p-12 overflow-y-auto">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Back Button */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-cyan-400 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to GenForge Workspace</span>
        </button>

        {/* Header */}
        <div className="border-b border-slate-800 pb-6 space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-800/60 text-cyan-400 text-xs font-mono font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>CodeBERT Vulnerability Engine</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Security Scanner Methodology & Evaluation Metrics
          </h1>
          <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
            Full empirical transparency regarding our CodeBERT neural classification pipeline, benchmark datasets, confusion matrix, and explicit architectural limitations.
          </p>
        </div>

        {/* Honest Positioning Statement */}
        <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <span className="font-bold text-amber-300">
              Guiding Principle: "A second opinion, not a certificate of safety"
            </span>
            <p className="text-amber-200/80 leading-relaxed">
              No static analyzer or machine learning model can mathematically guarantee the absence of vulnerabilities. GenForge runs both our trained neural model and deterministic AST pattern rules concurrently to catch common pitfalls early in development.
            </p>
          </div>
        </div>

        {/* Top-line Benchmark Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Precision</span>
            <div className="text-2xl font-bold font-mono text-cyan-400 mt-1">
              {(metrics.precision * 100).toFixed(1)}%
            </div>
            <span className="text-[10px] text-slate-500">Low false-positive rate</span>
          </div>
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Recall</span>
            <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
              {(metrics.recall * 100).toFixed(1)}%
            </div>
            <span className="text-[10px] text-slate-500">True defect capture</span>
          </div>
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">F1-Score</span>
            <div className="text-2xl font-bold font-mono text-indigo-400 mt-1">
              {(metrics.f1_score * 100).toFixed(2)}
            </div>
            <span className="text-[10px] text-slate-500">Harmonic mean</span>
          </div>
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">AUC-ROC</span>
            <div className="text-2xl font-bold font-mono text-purple-400 mt-1">
              {(metrics.auc_roc * 100).toFixed(1)}%
            </div>
            <span className="text-[10px] text-slate-500">Discriminative power</span>
          </div>
        </div>

        {/* Confusion Matrix */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-cyan-400" />
            <h2 className="text-base font-bold text-white">Validation Confusion Matrix</h2>
          </div>
          <p className="text-xs text-slate-400">
            Empirical results across {confusion_matrix.total.toLocaleString()} validated code snippets on the held-out Devign & Big-Vul test split:
          </p>

          <div className="grid grid-cols-2 gap-4 max-w-lg">
            <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/30">
              <span className="text-[10px] uppercase font-bold text-emerald-400">True Positives (TP)</span>
              <div className="text-xl font-bold font-mono text-white mt-1">
                {confusion_matrix.true_positives.toLocaleString()}
              </div>
              <span className="text-[10px] text-slate-500">Vulnerabilities correctly flagged</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-rose-500/30">
              <span className="text-[10px] uppercase font-bold text-rose-400">False Positives (FP)</span>
              <div className="text-xl font-bold font-mono text-white mt-1">
                {confusion_matrix.false_positives.toLocaleString()}
              </div>
              <span className="text-[10px] text-slate-500">Safe code flagged as vulnerable</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-rose-500/30">
              <span className="text-[10px] uppercase font-bold text-rose-400">False Negatives (FN)</span>
              <div className="text-xl font-bold font-mono text-white mt-1">
                {confusion_matrix.false_negatives.toLocaleString()}
              </div>
              <span className="text-[10px] text-slate-500">Missed vulnerability defects</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/30">
              <span className="text-[10px] uppercase font-bold text-emerald-400">True Negatives (TN)</span>
              <div className="text-xl font-bold font-mono text-white mt-1">
                {confusion_matrix.true_negatives.toLocaleString()}
              </div>
              <span className="text-[10px] text-slate-500">Correctly recognized clean code</span>
            </div>
          </div>
        </div>

        {/* Per-Vulnerability Breakdown */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <h2 className="text-base font-bold text-white">Detection Breakdown by CWE Category</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="pb-2 font-semibold">CWE ID</th>
                  <th className="pb-2 font-semibold">Vulnerability Type</th>
                  <th className="pb-2 font-semibold text-center">Precision</th>
                  <th className="pb-2 font-semibold text-center">Recall</th>
                  <th className="pb-2 font-semibold text-center">F1</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {per_vulnerability_type.map((item) => (
                  <tr key={item.cwe} className="hover:bg-slate-800/40">
                    <td className="py-2.5 font-bold text-cyan-400">{item.cwe}</td>
                    <td className="py-2.5 font-sans text-slate-200">{item.name}</td>
                    <td className="py-2.5 text-center text-slate-300">{(item.precision * 100).toFixed(0)}%</td>
                    <td className="py-2.5 text-center text-slate-300">{(item.recall * 100).toFixed(0)}%</td>
                    <td className="py-2.5 text-center font-bold text-emerald-400">{(item.f1 * 100).toFixed(0)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Explicit Limitations Section */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Database className="w-4 h-4 text-amber-400" />
            Architectural Limitations & Disclosure
          </h2>
          <ul className="space-y-2 text-xs text-slate-400 list-disc list-inside leading-relaxed">
            {limitations.map((lim, idx) => (
              <li key={idx}>{lim}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
