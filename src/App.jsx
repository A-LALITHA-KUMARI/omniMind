import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header.jsx';
import { Sidebar } from './components/Sidebar.jsx';
import { MessageItem } from './components/MessageItem.jsx';
import { MessageComposer } from './components/MessageComposer.jsx';
import { KnowledgeBaseDrawer } from './components/KnowledgeBaseDrawer.jsx';
import { EmptyChatState } from './components/EmptyChatState.jsx';
import { ConfirmModal } from './components/ConfirmModal.jsx';
import { 
  fetchHealth, 
  fetchModels,
  fetchDocuments, 
  sendChatRequest,
  streamChat 
} from './services/api.js';

const STORAGE_KEY = 'omnimind_conversations_v2';
const ACTIVE_CONV_KEY = 'omnimind_active_conv_id_v2';
const SELECTED_MODEL_KEY = 'omnimind_selected_model_v1';

function createDefaultConversation(domain = 'general') {
  return {
    id: `conv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    title: 'New Chat',
    domain,
    languageMode: 'auto',
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export default function App() {
  const [conversations, setConversations] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse stored conversations:', e);
    }
    return [createDefaultConversation()];
  });

  const [activeConversationId, setActiveConversationId] = useState(() => {
    const storedActive = localStorage.getItem(ACTIVE_CONV_KEY);
    return storedActive || conversations[0]?.id || '';
  });

  const [currentDomain, setCurrentDomain] = useState('general');
  const [languageMode, setLanguageMode] = useState('auto');
  const [enableRag, setEnableRag] = useState(true);

  // Models state
  const [availableModels, setAvailableModels] = useState([
    { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B (Versatile)' },
    { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B (Instant)' },
  ]);
  const [selectedModel, setSelectedModel] = useState(() => {
    return localStorage.getItem(SELECTED_MODEL_KEY) || 'llama-3.3-70b-versatile';
  });

  // Knowledge base and sidebar state
  const [documents, setDocuments] = useState([]);
  const [health, setHealth] = useState(null);
  const [isKnowledgeBaseOpen, setIsKnowledgeBaseOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Loading & Streaming
  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef(null);
  const chatBottomRef = useRef(null);

  // Modals state
  const [deleteConvId, setDeleteConvId] = useState(null);
  const [isClearAllOpen, setIsClearAllOpen] = useState(false);
  const [isClearCurrentOpen, setIsClearCurrentOpen] = useState(false);

  const activeConversation =
    conversations.find((c) => c.id === activeConversationId) || conversations[0];

  // Storage sync
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
    } catch (e) {
      console.warn('Failed to persist conversations:', e);
    }
  }, [conversations]);

  useEffect(() => {
    if (activeConversationId) {
      localStorage.setItem(ACTIVE_CONV_KEY, activeConversationId);
    }
  }, [activeConversationId]);

  useEffect(() => {
    if (selectedModel) {
      localStorage.setItem(SELECTED_MODEL_KEY, selectedModel);
    }
  }, [selectedModel]);

  useEffect(() => {
    if (activeConversation) {
      setCurrentDomain(activeConversation.domain || 'general');
      setLanguageMode(activeConversation.languageMode || 'auto');
    }
  }, [activeConversationId]);

  const refreshDocumentsAndHealth = async () => {
    try {
      const [h, docData, modelData] = await Promise.all([
        fetchHealth().catch(() => null),
        fetchDocuments().catch(() => ({ documents: [], stats: { documentCount: 0, chunkCount: 0 } })),
        fetchModels().catch(() => null),
      ]);
      if (h) setHealth(h);
      if (docData?.documents) setDocuments(docData.documents);
      if (modelData?.models && modelData.models.length > 0) {
        setAvailableModels(modelData.models);
        if (!selectedModel && modelData.defaultModel) {
          setSelectedModel(modelData.defaultModel);
        }
      }
    } catch (err) {
      console.error('Failed to load initial data:', err);
    }
  };

  useEffect(() => {
    refreshDocumentsAndHealth();
  }, []);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConversation?.messages, isLoading]);

  const handleNewConversation = (domain = currentDomain) => {
    const newConv = createDefaultConversation(domain);
    setConversations((prev) => [newConv, ...prev]);
    setActiveConversationId(newConv.id);
  };

  const handleSelectConversation = (id) => {
    setActiveConversationId(id);
  };

  const handleRenameConversation = (id, newTitle) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title: newTitle, updatedAt: Date.now() } : c))
    );
  };

  const confirmDeleteConversation = (id) => {
    setDeleteConvId(id);
  };

  const executeDeleteConversation = () => {
    if (!deleteConvId) return;
    const remaining = conversations.filter((c) => c.id !== deleteConvId);
    if (remaining.length === 0) {
      const fresh = [createDefaultConversation()];
      setConversations(fresh);
      setActiveConversationId(fresh[0].id);
    } else {
      setConversations(remaining);
      if (activeConversationId === deleteConvId) {
        setActiveConversationId(remaining[0].id);
      }
    }
    setDeleteConvId(null);
  };

  const executeClearCurrentChat = () => {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversationId
          ? { ...c, messages: [], updatedAt: Date.now() }
          : c
      )
    );
    setIsClearCurrentOpen(false);
  };

  const executeClearAll = () => {
    const fresh = [createDefaultConversation()];
    setConversations(fresh);
    setActiveConversationId(fresh[0].id);
    setIsClearAllOpen(false);
  };

  const handleSelectDomain = (domain) => {
    setCurrentDomain(domain);
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversationId ? { ...c, domain, updatedAt: Date.now() } : c
      )
    );
  };

  const handleSelectLanguage = (lang) => {
    setLanguageMode(lang);
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversationId ? { ...c, languageMode: lang, updatedAt: Date.now() } : c
      )
    );
  };

  // Chat message submission with progressive streaming & fast fallback
  const handleSendMessage = async (text) => {
    if (!text.trim() || isLoading) return;

    const userMessage = {
      id: `msg_u_${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: Date.now(),
      domain: currentDomain,
    };

    const assistantPlaceholderId = `msg_a_${Date.now()}`;
    const assistantMessage = {
      id: assistantPlaceholderId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      domain: currentDomain,
      isStreaming: true,
    };

    const isFirstMessage = activeConversation.messages.length === 0;
    let autoTitle = activeConversation.title;
    if (isFirstMessage) {
      const words = text.trim().split(/\s+/);
      autoTitle = words.slice(0, 5).join(' ') + (words.length > 5 ? '...' : '');
    }

    const updatedMessages = [...activeConversation.messages, userMessage, assistantMessage];
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversationId
          ? {
              ...c,
              title: isFirstMessage ? autoTitle : c.title,
              messages: updatedMessages,
              updatedAt: Date.now(),
            }
          : c
      )
    );

    setIsLoading(true);
    abortControllerRef.current = new AbortController();

    try {
      const messagePayload = [...activeConversation.messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      let accumulatedText = '';
      let collectedCitations = [];

      await streamChat({
        messages: messagePayload,
        model: selectedModel,
        domain: currentDomain,
        languageMode,
        enableRag,
        signal: abortControllerRef.current.signal,
        onChunk: (chunk) => {
          accumulatedText += chunk;
          setConversations((prev) =>
            prev.map((c) => {
              if (c.id !== activeConversationId) return c;
              return {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === assistantPlaceholderId
                    ? { ...m, content: accumulatedText, isStreaming: true }
                    : m
                ),
              };
            })
          );
        },
        onCitations: (citations) => {
          collectedCitations = citations;
          setConversations((prev) =>
            prev.map((c) => {
              if (c.id !== activeConversationId) return c;
              return {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === assistantPlaceholderId ? { ...m, citations } : m
                ),
              };
            })
          );
        },
      });

      const finalContent = accumulatedText.trim();

      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== activeConversationId) return c;
          return {
            ...c,
            messages: c.messages.map((m) =>
              m.id === assistantPlaceholderId
                ? {
                    ...m,
                    content: finalContent,
                    error: finalContent.length === 0 ? 'Groq completed without generating text. Please retry.' : undefined,
                    isStreaming: false,
                    citations: collectedCitations,
                  }
                : m
            ),
          };
        })
      );
    } catch (err) {
      if (err.name === 'AbortError') {
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id !== activeConversationId) return c;
            return {
              ...c,
              messages: c.messages.map((m) =>
                m.id === assistantPlaceholderId
                  ? { ...m, isStreaming: false }
                  : m
              ),
            };
          })
        );
      } else {
        console.error('Chat error:', err);
        const errorMessage = err.message || 'Error communicating with Groq API. Please verify GROQ_API_KEY in Settings > Secrets.';
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id !== activeConversationId) return c;
            return {
              ...c,
              messages: c.messages.map((m) =>
                m.id === assistantPlaceholderId
                  ? {
                      ...m,
                      content: m.content || '',
                      error: errorMessage,
                      isStreaming: false,
                    }
                  : m
              ),
            };
          })
        );
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleRetry = (msgIndex) => {
    if (isLoading) return;
    const targetMessages = activeConversation.messages.slice(0, msgIndex);
    const lastUser = [...targetMessages].reverse().find((m) => m.role === 'user');
    if (!lastUser) return;

    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversationId
          ? { ...c, messages: targetMessages.filter((m) => m.id !== activeConversation.messages[msgIndex]?.id) }
          : c
      )
    );

    handleSendMessage(lastUser.content);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white font-sans text-gray-900">
      {/* Left Navigation Sidebar */}
      <Sidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        onRenameConversation={handleRenameConversation}
        onDeleteConversation={confirmDeleteConversation}
        onClearAll={() => setIsClearAllOpen(true)}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        documentCount={documents.length}
        onOpenKnowledgeBase={() => setIsKnowledgeBaseOpen(true)}
      />

      {/* Main Chat Workspace */}
      <div className="relative flex flex-1 flex-col overflow-hidden bg-white">
        {/* Top Navigation Bar */}
        <Header
          currentDomain={currentDomain}
          onSelectDomain={handleSelectDomain}
          languageMode={languageMode}
          onSelectLanguage={handleSelectLanguage}
          selectedModel={selectedModel}
          onSelectModel={setSelectedModel}
          availableModels={availableModels}
          onNewChat={() => handleNewConversation(currentDomain)}
          onClearChat={() => setIsClearCurrentOpen(true)}
          hasMessages={activeConversation.messages.length > 0}
          onToggleKnowledgeBase={() => setIsKnowledgeBaseOpen(!isKnowledgeBaseOpen)}
          isKnowledgeBaseOpen={isKnowledgeBaseOpen}
          documentCount={documents.length}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          isSidebarOpen={isSidebarOpen}
          health={health}
        />

        {/* Chat message scroll area */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {activeConversation.messages.length === 0 ? (
            <EmptyChatState />
          ) : (
            <div className="mx-auto max-w-3xl space-y-4">
              {activeConversation.messages.map((message, idx) => (
                <MessageItem
                  key={message.id || idx}
                  message={message}
                  onRetry={message.role === 'assistant' ? () => handleRetry(idx) : undefined}
                  isStreaming={message.isStreaming}
                />
              ))}
              <div ref={chatBottomRef} />
            </div>
          )}
        </div>

        {/* Bottom Search-Style Input Bar */}
        <MessageComposer
          onSendMessage={handleSendMessage}
          onStopGeneration={handleStopGeneration}
          isLoading={isLoading}
          enableRag={enableRag}
          onToggleRag={() => setEnableRag(!enableRag)}
          documentCount={documents.length}
          onDocumentUploaded={refreshDocumentsAndHealth}
          onOpenKnowledgeBase={() => setIsKnowledgeBaseOpen(true)}
        />
      </div>

      {/* Right Knowledge-Base Panel */}
      <KnowledgeBaseDrawer
        isOpen={isKnowledgeBaseOpen}
        onClose={() => setIsKnowledgeBaseOpen(false)}
        documents={documents}
        onDocumentsUpdated={refreshDocumentsAndHealth}
      />

      {/* Confirmation Modals */}
      <ConfirmModal
        isOpen={Boolean(deleteConvId)}
        title="Delete Conversation"
        message="Are you sure you want to delete this chat?"
        confirmLabel="Delete"
        onConfirm={executeDeleteConversation}
        onCancel={() => setDeleteConvId(null)}
      />

      <ConfirmModal
        isOpen={isClearCurrentOpen}
        title="Clear Current Chat"
        message="Are you sure you want to clear all messages in this conversation?"
        confirmLabel="Clear"
        onConfirm={executeClearCurrentChat}
        onCancel={() => setIsClearCurrentOpen(false)}
      />

      <ConfirmModal
        isOpen={isClearAllOpen}
        title="Clear All History"
        message="Are you sure you want to remove all chat conversations?"
        confirmLabel="Clear All"
        onConfirm={executeClearAll}
        onCancel={() => setIsClearAllOpen(false)}
      />
    </div>
  );
}
