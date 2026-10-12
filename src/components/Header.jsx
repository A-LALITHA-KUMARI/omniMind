import React from 'react';
import { 
  Plus, 
  BookOpen, 
  PanelLeft, 
  Trash2,
  AlertCircle,
  Cpu
} from 'lucide-react';

export const Header = ({
  currentDomain,
  onSelectDomain,
  languageMode,
  onSelectLanguage,
  selectedModel,
  onSelectModel,
  availableModels = [],
  onNewChat,
  onClearChat,
  hasMessages,
  onToggleKnowledgeBase,
  isKnowledgeBaseOpen,
  documentCount,
  onToggleSidebar,
  health,
}) => {
  return (
    <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-gray-200 bg-white px-4 text-gray-800">
      {/* Left side: Sidebar Toggle & OmniMind Logo */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
          className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition"
          title="Toggle Navigation Sidebar"
        >
          <PanelLeft className="h-5 w-5" />
        </button>

        <div className="flex items-center space-x-2 cursor-pointer" onClick={onNewChat}>
          <span className="text-base font-bold tracking-tight text-gray-900 font-sans">
            Omni<span className="text-emerald-600">Mind</span> AI
          </span>
        </div>
      </div>

      {/* Middle: Domain, Language & Groq Model Selectors */}
      <div className="hidden sm:flex items-center space-x-2">
        {/* Model Selector */}
        {availableModels && availableModels.length > 0 && (
          <div className="flex items-center rounded-md border border-gray-200 bg-white px-2 py-0.5 text-xs text-gray-700">
            <Cpu className="h-3.5 w-3.5 text-emerald-600 mr-1.5 shrink-0" />
            <select
              value={selectedModel}
              onChange={(e) => onSelectModel?.(e.target.value)}
              className="bg-transparent text-xs text-gray-800 focus:outline-none cursor-pointer pr-1 font-medium"
              title="Select Groq LLM Model"
            >
              {availableModels.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name || m.id}
                </option>
              ))}
            </select>
          </div>
        )}

        <select
          value={currentDomain}
          onChange={(e) => onSelectDomain(e.target.value)}
          className="rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-700 hover:border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-300 cursor-pointer"
        >
          <option value="general">General</option>
          <option value="coding">Programming</option>
          <option value="education">Education</option>
          <option value="stem">STEM & Math</option>
          <option value="agriculture">Agriculture</option>
          <option value="healthcare">Healthcare</option>
          <option value="career">Career</option>
          <option value="english_telugu">English & Telugu</option>
        </select>

        <select
          value={languageMode}
          onChange={(e) => onSelectLanguage(e.target.value)}
          className="rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-700 hover:border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-300 cursor-pointer"
        >
          <option value="auto">Language: Auto</option>
          <option value="bilingual">Bilingual (EN + తెలుగు)</option>
          <option value="english">English</option>
          <option value="telugu">Telugu (తెలుగు)</option>
        </select>
      </div>

      {/* Right side: Status, Clear/New Chat, Knowledge Base */}
      <div className="flex items-center space-x-2">
        {/* Status */}
        <div className="hidden md:flex items-center space-x-1.5 text-xs text-gray-500 mr-1">
          {health?.groqConfigured ? (
            <>
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>Groq Online</span>
            </>
          ) : (
            <>
              <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-amber-600">Groq Key Required</span>
            </>
          )}
        </div>

        {/* Clear Chat (when messages exist) */}
        {hasMessages && onClearChat && (
          <button
            onClick={onClearChat}
            className="flex items-center space-x-1 rounded-md border border-gray-200 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50 hover:text-red-600 transition"
            title="Clear current conversation"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Clear</span>
          </button>
        )}

        {/* New Chat */}
        <button
          onClick={onNewChat}
          className="flex items-center space-x-1 rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition"
          title="Start new conversation"
        >
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">New Chat</span>
        </button>

        {/* Knowledge Base Sidebar Trigger */}
        <button
          onClick={onToggleKnowledgeBase}
          className={`flex items-center space-x-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition ${
            isKnowledgeBaseOpen
              ? 'border-gray-900 bg-gray-900 text-white'
              : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900'
          }`}
          title="Toggle Knowledge Base"
        >
          <BookOpen className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Knowledge Base</span>
          {documentCount > 0 && (
            <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-semibold ${
              isKnowledgeBaseOpen ? 'bg-white text-gray-900' : 'bg-gray-100 text-gray-700'
            }`}>
              {documentCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};
