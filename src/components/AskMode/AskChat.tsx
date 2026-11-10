import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Square, 
  RotateCw, 
  Edit2, 
  Copy, 
  Check, 
  Globe, 
  ExternalLink, 
  Sparkles, 
  Search,
  AlertCircle
} from 'lucide-react';
import { AskMessage, AskSource } from '../../types/index.js';

interface AskChatProps {
  messages: AskMessage[];
  isStreaming: boolean;
  onSendMessage: (text: string, enableSearch?: boolean) => void;
  onStopStreaming: () => void;
  onRegenerate: () => void;
  onEditMessage: (index: number, newText: string) => void;
}

const STARTER_PROMPTS = [
  'How does the CodeBERT dual-signal cross-check work against CWE-79 and CWE-95?',
  'Explain sub-10ms edge caching architecture with SQLite replicas.',
  'What are the critical architectural tradeoffs of React 19 server components?',
  'Write a TypeScript utility for rate-limiting async functions with token bucket algorithm.',
];

export const AskChat: React.FC<AskChatProps> = ({
  messages,
  isStreaming,
  onSendMessage,
  onStopStreaming,
  onRegenerate,
  onEditMessage,
}) => {
  const [inputText, setInputText] = useState('');
  const [enableSearch, setEnableSearch] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editInput, setEditInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() || isStreaming) return;
    onSendMessage(inputText.trim(), enableSearch);
    setInputText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleStartEdit = (index: number, content: string) => {
    setEditingIndex(index);
    setEditInput(content);
  };

  const handleSaveEdit = (index: number) => {
    if (editInput.trim()) {
      onEditMessage(index, editInput.trim());
      setEditingIndex(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0a0e17] text-slate-100 overflow-hidden relative">
      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto px-4 py-8">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Empty State / Centered Search */}
          {messages.length === 0 && (
            <div className="py-12 sm:py-20 flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-6 shadow-lg shadow-cyan-500/10">
                <Sparkles className="w-7 h-7" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-3">
                GenForge <span className="text-cyan-400">Ask AI</span>
              </h1>
              <p className="text-slate-400 text-sm max-w-lg mb-8 leading-relaxed">
                Accurate research assistant with deterministic citations and live web grounding.
                Never hallucinating sources.
              </p>

              {/* Starter Question Cards */}
              <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-2xl text-left">
                {STARTER_PROMPTS.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setInputText(prompt);
                      textareaRef.current?.focus();
                    }}
                    className="p-3.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800/80 hover:border-slate-700 text-xs text-slate-300 hover:text-white transition group flex items-start gap-2.5 text-left"
                  >
                    <Search className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 mt-0.5 flex-shrink-0 transition" />
                    <span className="line-clamp-2">{prompt}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Render Messages */}
          {messages.map((msg, index) => {
            const isUser = msg.role === 'user';
            const isLast = index === messages.length - 1;

            return (
              <div
                key={msg.id}
                className={`flex gap-3 sm:gap-4 ${
                  isUser ? 'justify-end' : 'justify-start'
                }`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-800/60 flex items-center justify-center text-cyan-400 flex-shrink-0 mt-1 shadow">
                    <Sparkles className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[88%] sm:max-w-[80%] rounded-2xl px-5 py-4 text-sm leading-relaxed ${
                    isUser
                      ? 'bg-cyan-600 text-white shadow-md'
                      : 'bg-slate-900/90 border border-slate-800 text-slate-200'
                  }`}
                >
                  {/* User Message Edit Mode */}
                  {isUser && editingIndex === index ? (
                    <div className="space-y-2">
                      <textarea
                        value={editInput}
                        onChange={(e) => setEditInput(e.target.value)}
                        className="w-full bg-cyan-700 text-white rounded p-2 text-xs outline-none resize-none"
                        rows={3}
                      />
                      <div className="flex justify-end gap-2 text-xs">
                        <button
                          onClick={() => setEditingIndex(null)}
                          className="px-2 py-1 rounded bg-cyan-800 hover:bg-cyan-900"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSaveEdit(index)}
                          className="px-2 py-1 rounded bg-white text-cyan-900 font-semibold"
                        >
                          Save & Submit
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      {/* Web Search status indicator */}
                      {!isUser && msg.searchedWeb && (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-950/70 border border-cyan-800/50 text-[11px] text-cyan-300 font-medium mb-3">
                          <Globe className="w-3 h-3 text-cyan-400" />
                          <span>Searched the web for real-time citations</span>
                        </div>
                      )}

                      {/* Content */}
                      <div className="whitespace-pre-wrap font-sans">
                        {msg.content}
                        {msg.isStreaming && (
                          <span className="inline-block w-2 h-4 ml-1 bg-cyan-400 animate-pulse align-middle" />
                        )}
                      </div>

                      {/* Cited Sources List */}
                      {!isUser && msg.sources && msg.sources.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-slate-800">
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-2">
                            Sources Cited:
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {msg.sources.map((src, sIdx) => (
                              <a
                                key={sIdx}
                                href={src.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-between p-2 rounded-lg bg-slate-950 hover:bg-slate-800/80 border border-slate-800 text-[11px] text-cyan-400 hover:text-cyan-300 transition group"
                              >
                                <span className="truncate pr-2 font-medium">
                                  [{sIdx + 1}] {src.title}
                                </span>
                                <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-cyan-400 flex-shrink-0" />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Message Actions */}
                      <div className="flex items-center justify-between mt-3 pt-2 text-[11px] text-slate-400">
                        <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleCopy(msg.content, msg.id)}
                            className="p-1 hover:text-white rounded transition"
                            title="Copy message"
                          >
                            {copiedId === msg.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                          {isUser && !isStreaming && (
                            <button
                              onClick={() => handleStartEdit(index, msg.content)}
                              className="p-1 hover:text-white rounded transition"
                              title="Edit question"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {!isUser && isLast && !isStreaming && (
                            <button
                              onClick={onRegenerate}
                              className="p-1 hover:text-white rounded transition"
                              title="Regenerate answer"
                            >
                              <RotateCw className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Form & Bottom Bar */}
      <div className="border-t border-slate-800/80 bg-[#0d131f] p-4">
        <div className="max-w-3xl mx-auto space-y-2">
          {/* Search Toggle & Disclaimer */}
          <div className="flex items-center justify-between px-1 text-xs">
            <button
              type="button"
              onClick={() => setEnableSearch(!enableSearch)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition ${
                enableSearch
                  ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-300'
              }`}
            >
              <Globe className="w-3 h-3" />
              <span>Web Search: {enableSearch ? 'Active' : 'Auto'}</span>
            </button>

            <span className="text-[11px] text-slate-500 flex items-center gap-1">
              <AlertCircle className="w-3 h-3 text-slate-500" />
              AI can make mistakes. Verify critical facts.
            </span>
          </div>

          {/* Text Input Box */}
          <form onSubmit={handleSubmit} className="relative flex items-center">
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything or request technical explanation... (Enter to send, Shift+Enter for newline)"
              className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-500/60 rounded-xl px-4 py-3 pr-24 text-sm text-white placeholder-slate-500 outline-none transition resize-none min-h-[48px] max-h-36"
              rows={1}
            />

            <div className="absolute right-2.5 flex items-center gap-1.5">
              {isStreaming ? (
                <button
                  type="button"
                  onClick={onStopStreaming}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs flex items-center gap-1 transition"
                  title="Stop generation"
                >
                  <Square className="w-3 h-3 fill-current" />
                  <span>Stop</span>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className="p-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-30 disabled:hover:bg-cyan-500 text-slate-950 font-bold transition shadow-sm"
                  title="Send message"
                >
                  <Send className="w-4 h-4" />
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
