import React, { useState } from 'react';
import { 
  Plus, 
  MessageSquare, 
  Trash2, 
  Edit3, 
  Check, 
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Conversation } from '../../types/index.js';

interface AskSidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, newTitle: string) => void;
}

export const AskSidebar: React.FC<AskSidebarProps> = ({
  conversations,
  activeId,
  onSelect,
  onNewChat,
  onDelete,
  onRename,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const handleStartRename = (conv: Conversation) => {
    setEditingId(conv.id);
    setEditTitle(conv.title);
  };

  const handleSaveRename = (id: string) => {
    if (editTitle.trim()) {
      onRename(id, editTitle.trim());
      setEditingId(null);
    }
  };

  if (isCollapsed) {
    return (
      <div className="w-12 border-r border-slate-800 bg-[#0d131f] flex flex-col items-center py-4 space-y-4">
        <button
          onClick={() => setIsCollapsed(false)}
          className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition"
          title="Expand sidebar"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          onClick={onNewChat}
          className="p-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white transition shadow"
          title="New Chat"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="w-64 border-r border-slate-800 bg-[#0d131f] flex flex-col h-full select-none">
      {/* Top action */}
      <div className="p-3 border-b border-slate-800 flex items-center justify-between">
        <button
          onClick={onNewChat}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>New Thread</span>
        </button>
        <button
          onClick={() => setIsCollapsed(true)}
          className="p-2 ml-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
          title="Collapse sidebar"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 px-2 py-1 block">
          Recent Inquiries
        </span>

        {conversations.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-500 px-4">
            No saved conversations yet. Ask a question to begin.
          </div>
        ) : (
          conversations.map((conv) => {
            const isActive = conv.id === activeId;
            const isEditing = editingId === conv.id;

            return (
              <div
                key={conv.id}
                className={`group flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition cursor-pointer ${
                  isActive
                    ? 'bg-slate-800 text-white font-medium shadow-sm'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                }`}
                onClick={() => !isEditing && onSelect(conv.id)}
              >
                {isEditing ? (
                  <div className="flex items-center gap-1 w-full" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="bg-slate-950 text-white text-xs px-2 py-1 rounded w-full outline-none border border-cyan-500"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveRename(conv.id);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                    />
                    <button
                      onClick={() => handleSaveRename(conv.id)}
                      className="p-1 hover:text-emerald-400"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="p-1 hover:text-rose-400"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 truncate pr-2">
                      <MessageSquare className="w-3.5 h-3.5 flex-shrink-0 text-slate-500 group-hover:text-cyan-400" />
                      <span className="truncate">{conv.title}</span>
                    </div>

                    <div className="hidden group-hover:flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartRename(conv);
                        }}
                        className="p-1 hover:text-cyan-400 transition"
                        title="Rename"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(conv.id);
                        }}
                        className="p-1 hover:text-rose-400 transition"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
