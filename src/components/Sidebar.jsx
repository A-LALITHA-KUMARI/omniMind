import React, { useState } from 'react';
import { 
  MessageSquare, 
  Trash2, 
  Edit2, 
  Check, 
  X, 
  Plus, 
  BookOpen, 
  ChevronLeft,
  Search
} from 'lucide-react';

export const Sidebar = ({
  conversations = [],
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onRenameConversation,
  onDeleteConversation,
  onClearAll,
  isOpen,
  onClose,
  documentCount = 0,
  onOpenKnowledgeBase,
}) => {
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredConversations = conversations.filter((c) =>
    (c.title || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const startRename = (conv, e) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditTitle(conv.title);
  };

  const saveRename = (id, e) => {
    e?.preventDefault();
    if (editTitle.trim()) {
      onRenameConversation(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const cancelRename = (e) => {
    e.stopPropagation();
    setEditingId(null);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20 lg:hidden"
        onClick={onClose}
      />

      {/* Sidebar container */}
      <aside className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-gray-200 bg-gray-50 transition-all duration-200 ease-in-out lg:static lg:z-10">
        {/* Top Header */}
        <div className="flex h-14 items-center justify-between border-b border-gray-200 px-3.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            OmniMind AI
          </span>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-700 transition"
            title="Collapse sidebar"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>

        {/* Action: New Chat */}
        <div className="p-3">
          <button
            onClick={() => {
              onNewConversation();
            }}
            className="flex w-full items-center justify-center space-x-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-800 shadow-xs hover:bg-gray-100 transition active:scale-[0.99]"
          >
            <Plus className="h-4 w-4 text-gray-600" />
            <span>New Chat</span>
          </button>
        </div>

        {/* Search Input */}
        {conversations.length > 3 && (
          <div className="px-3 pb-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-md border border-gray-200 bg-white py-1.5 pl-8 pr-2.5 text-xs text-gray-800 placeholder-gray-400 focus:border-gray-400 focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* Chat History List */}
        <div className="flex-1 overflow-y-auto px-2 space-y-0.5">
          <div className="px-2 py-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
            History
          </div>

          {filteredConversations.length === 0 ? (
            <div className="px-3 py-4 text-center text-xs text-gray-400">
              No conversations yet.
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isActive = conv.id === activeConversationId;
              const isEditing = editingId === conv.id;

              return (
                <div
                  key={conv.id}
                  onClick={() => {
                    if (!isEditing) {
                      onSelectConversation(conv.id);
                    }
                  }}
                  className={`group relative flex items-center justify-between rounded-md px-2.5 py-2 text-xs transition cursor-pointer ${
                    isActive
                      ? 'bg-white font-medium text-gray-900 border border-gray-200 shadow-xs'
                      : 'text-gray-600 hover:bg-gray-100/80 hover:text-gray-900'
                  }`}
                >
                  <div className="flex items-center space-x-2 truncate pr-2">
                    <MessageSquare className="h-3.5 w-3.5 shrink-0 text-gray-400 group-hover:text-gray-600" />
                    {isEditing ? (
                      <form
                        onSubmit={(e) => saveRename(conv.id, e)}
                        className="flex items-center space-x-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          autoFocus
                          className="w-32 rounded border border-gray-400 bg-white px-1.5 py-0.5 text-xs text-gray-900 focus:outline-none"
                        />
                        <button
                          type="submit"
                          className="p-0.5 text-gray-600 hover:text-gray-900"
                          title="Save"
                        >
                          <Check className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={cancelRename}
                          className="p-0.5 text-gray-400 hover:text-gray-600"
                          title="Cancel"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </form>
                    ) : (
                      <span className="truncate">{conv.title}</span>
                    )}
                  </div>

                  {!isEditing && (
                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => startRename(conv, e)}
                        className="p-1 text-gray-400 hover:text-gray-700"
                        title="Rename"
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteConversation(conv.id);
                        }}
                        className="p-1 text-gray-400 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Bottom Actions */}
        <div className="border-t border-gray-200 p-2.5 space-y-1">
          <button
            onClick={onOpenKnowledgeBase}
            className="flex w-full items-center justify-between rounded-md px-2.5 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 transition"
          >
            <div className="flex items-center space-x-2">
              <BookOpen className="h-3.5 w-3.5 text-gray-500" />
              <span>Knowledge Base</span>
            </div>
            {documentCount > 0 && (
              <span className="rounded bg-gray-200 px-1.5 py-0.2 text-[10px] text-gray-700 font-semibold">
                {documentCount}
              </span>
            )}
          </button>

          {conversations.length > 0 && (
            <button
              onClick={onClearAll}
              className="flex w-full items-center space-x-2 rounded-md px-2.5 py-1.5 text-xs text-gray-500 hover:bg-red-50 hover:text-red-600 transition"
            >
              <Trash2 className="h-3.5 w-3.5 text-gray-400" />
              <span>Clear History</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
