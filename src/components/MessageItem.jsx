import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  Copy, 
  Check, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  FileText, 
  ChevronDown, 
  ChevronUp
} from 'lucide-react';

export const MessageItem = ({
  message,
  onRetry,
  isStreaming = false,
}) => {
  const [copied, setCopied] = useState(false);
  const [showCitations, setShowCitations] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const isUser = message.role === 'user';

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleSpeech = () => {
    if (!('speechSynthesis' in window)) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(message.content);
      const hasTelugu = /[\u0C00-\u0C7F]/.test(message.content);
      utterance.lang = hasTelugu ? 'te-IN' : 'en-US';
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    }
  };

  const CodeBlock = ({ inline, className, children, ...props }) => {
    const [codeCopied, setCodeCopied] = useState(false);
    const match = /language-(\w+)/.exec(className || '');
    const language = match ? match[1] : '';
    const codeString = String(children).replace(/\n$/, '');

    if (inline || !match) {
      return (
        <code className="rounded bg-gray-100 px-1.5 py-0.5 text-[12px] font-mono text-gray-800" {...props}>
          {children}
        </code>
      );
    }

    const copyCode = () => {
      navigator.clipboard.writeText(codeString);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    };

    return (
      <div className="relative my-3 rounded-lg border border-gray-200 bg-gray-900 overflow-hidden shadow-xs">
        <div className="flex items-center justify-between border-b border-gray-800 bg-gray-950 px-3 py-1.5 text-xs text-gray-400">
          <span className="font-mono text-[11px] font-medium text-gray-300 uppercase">{language}</span>
          <button
            onClick={copyCode}
            className="flex items-center space-x-1 rounded px-2 py-0.5 text-[11px] text-gray-300 hover:text-white transition"
          >
            {codeCopied ? (
              <>
                <Check className="h-3 w-3 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
        <div className="p-3 overflow-x-auto text-xs font-mono leading-relaxed text-gray-100">
          <pre>{children}</pre>
        </div>
      </div>
    );
  };

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} my-3 px-2`}>
      <div className={`max-w-3xl w-full ${isUser ? 'flex justify-end' : ''}`}>
        <div
          className={`rounded-2xl p-4 transition ${
            isUser
              ? 'bg-gray-100 text-gray-900 max-w-xl'
              : 'bg-white border border-gray-200 text-gray-900 shadow-xs w-full'
          }`}
        >
          {/* Header */}
          <div className="mb-1.5 flex items-center justify-between text-xs text-gray-400">
            <span className="font-semibold text-gray-700">
              {isUser ? 'You' : 'OmniMind AI'}
            </span>
            <span>
              {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          {/* RAG Citations Accordion */}
          {!isUser && message.citations && message.citations.length > 0 && (
            <div className="mb-3 rounded-lg border border-gray-200 bg-gray-50 p-2.5">
              <button
                onClick={() => setShowCitations(!showCitations)}
                className="flex w-full items-center justify-between text-xs font-medium text-gray-700 hover:text-gray-900"
              >
                <div className="flex items-center space-x-1.5">
                  <FileText className="h-3.5 w-3.5 text-gray-500" />
                  <span>Sources ({message.citations.length})</span>
                </div>
                {showCitations ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>

              {showCitations && (
                <div className="mt-2 space-y-1.5 border-t border-gray-200 pt-2 text-[11px]">
                  {message.citations.map((cite, idx) => (
                    <div key={cite.id || idx} className="rounded bg-white p-2 border border-gray-200">
                      <div className="flex items-center justify-between font-medium text-gray-800">
                        <span className="truncate">{cite.documentName}</span>
                        <span className="text-[10px] text-gray-500">
                          Page {cite.pageNumber} • {(cite.similarity * 100).toFixed(0)}%
                        </span>
                      </div>
                      <p className="mt-1 text-gray-600 line-clamp-2 italic">
                        "{cite.text}"
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Message Content */}
          <div className="prose prose-sm max-w-none text-gray-800 break-words leading-relaxed">
            {isUser ? (
              <p className="whitespace-pre-wrap text-sm">{message.content}</p>
            ) : (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code: CodeBlock,
                  h1: ({ children }) => <h1 className="text-base font-bold text-gray-900 mt-3 mb-1.5">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-sm font-bold text-gray-900 mt-2.5 mb-1">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-xs font-semibold text-gray-900 mt-2 mb-1">{children}</h3>,
                  p: ({ children }) => <p className="mb-2 text-sm text-gray-800 leading-relaxed">{children}</p>,
                  ul: ({ children }) => <ul className="list-disc pl-5 my-2 space-y-1 text-sm text-gray-800">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal pl-5 my-2 space-y-1 text-sm text-gray-800">{children}</ol>,
                  li: ({ children }) => <li className="text-sm text-gray-800">{children}</li>,
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-3 border-gray-300 bg-gray-50 pl-3 py-1 my-2 text-gray-700 italic text-sm">
                      {children}
                    </blockquote>
                  ),
                  table: ({ children }) => (
                    <div className="my-2.5 overflow-x-auto rounded border border-gray-200">
                      <table className="min-w-full divide-y divide-gray-200 text-xs">{children}</table>
                    </div>
                  ),
                  thead: ({ children }) => <thead className="bg-gray-50 text-gray-700 font-semibold">{children}</thead>,
                  th: ({ children }) => <th className="px-2.5 py-1.5 border-b border-gray-200">{children}</th>,
                  td: ({ children }) => <td className="px-2.5 py-1.5 border-b border-gray-100 text-gray-700">{children}</td>,
                }}
              >
                {message.content}
              </ReactMarkdown>
            )}
          </div>

          {/* Streaming indicator */}
          {message.isStreaming && (
            <span className="inline-block h-3.5 w-1.5 animate-pulse bg-gray-800 ml-1 align-middle" />
          )}

          {/* Empty response fallback */}
          {!message.isStreaming && !message.content && !message.error && !isUser && (
            <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800">
              <p>No text was generated by the model.</p>
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="mt-1.5 inline-flex items-center space-x-1 font-semibold text-amber-900 underline hover:no-underline"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Click here to retry</span>
                </button>
              )}
            </div>
          )}

          {/* Error alert with retry button */}
          {message.error && (
            <div className="mt-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-red-900">Unable to generate response</p>
                  <p className="mt-0.5 text-red-700">{message.error}</p>
                </div>
                {onRetry && (
                  <button
                    onClick={onRetry}
                    className="ml-2 inline-flex items-center space-x-1 rounded bg-white px-2 py-1 text-xs font-medium text-red-700 shadow-2xs border border-red-300 hover:bg-red-100"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Retry</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Action buttons */}
          {!isUser && !message.isStreaming && (
            <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-2 text-[11px] text-gray-500">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => copyToClipboard(message.content)}
                  className="flex items-center space-x-1 rounded px-1.5 py-0.5 hover:bg-gray-100 hover:text-gray-800 transition"
                  title="Copy response"
                >
                  {copied ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-600" />
                      <span className="text-emerald-600">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>

                <button
                  onClick={toggleSpeech}
                  className="flex items-center space-x-1 rounded px-1.5 py-0.5 hover:bg-gray-100 hover:text-gray-800 transition"
                  title={isSpeaking ? 'Stop speech' : 'Read aloud'}
                >
                  {isSpeaking ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
                  <span>{isSpeaking ? 'Stop' : 'Read'}</span>
                </button>

                {onRetry && (
                  <button
                    onClick={onRetry}
                    className="flex items-center space-x-1 rounded px-1.5 py-0.5 hover:bg-gray-100 hover:text-gray-800 transition"
                    title="Retry answer"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Retry</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
