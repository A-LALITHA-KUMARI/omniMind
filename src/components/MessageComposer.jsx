import React, { useState, useRef, useEffect } from 'react';
import { 
  ArrowUp, 
  Square, 
  Paperclip, 
  Loader2, 
  BookOpen,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { uploadDocument } from '../services/api.js';

export const MessageComposer = ({
  onSendMessage,
  onStopGeneration,
  isLoading,
  enableRag,
  onToggleRag,
  documentCount = 0,
  onDocumentUploaded,
  onOpenKnowledgeBase,
}) => {
  const [input, setInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadFeedback, setUploadFeedback] = useState(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [input]);

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (isLoading) return;
    const trimmed = input.trim();
    if (!trimmed) return;

    onSendMessage(trimmed);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validExtensions = ['.pdf', '.docx', '.txt'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!validExtensions.includes(ext)) {
      setUploadFeedback({ type: 'error', message: 'Only PDF, DOCX, or TXT documents supported.' });
      setTimeout(() => setUploadFeedback(null), 4000);
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setUploadFeedback({ type: 'error', message: 'File exceeds 15MB limit.' });
      setTimeout(() => setUploadFeedback(null), 4000);
      return;
    }

    setIsUploading(true);
    setUploadFeedback(null);

    try {
      const res = await uploadDocument(file);
      setIsUploading(false);
      setUploadFeedback({ type: 'success', message: `Uploaded "${res.document.filename}"` });
      onDocumentUploaded?.();
      if (!enableRag && onToggleRag) {
        onToggleRag();
      }
      setTimeout(() => setUploadFeedback(null), 4000);
    } catch (err) {
      setIsUploading(false);
      setUploadFeedback({ type: 'error', message: err.message || 'Upload failed' });
      setTimeout(() => setUploadFeedback(null), 4000);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="w-full bg-transparent px-4 pb-5 pt-2">
      <div className="mx-auto max-w-3xl">
        {/* Upload feedback */}
        {uploadFeedback && (
          <div className="mb-2 flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs shadow-xs text-gray-700">
            <div className="flex items-center space-x-1.5">
              {uploadFeedback.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              <span>{uploadFeedback.message}</span>
            </div>
            <button
              onClick={() => setUploadFeedback(null)}
              className="text-gray-400 hover:text-gray-600 text-xs"
            >
              ✕
            </button>
          </div>
        )}

        {/* Modern AI search-style input container */}
        <form
          onSubmit={handleSubmit}
          className="relative rounded-2xl border border-gray-300 bg-white p-2.5 shadow-sm transition-all focus-within:border-gray-400 focus-within:shadow-md"
        >
          {/* Textarea */}
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything..."
            className="w-full resize-none bg-transparent px-2.5 pt-1 text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
          />

          {/* Bottom toolbar */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center space-x-1.5">
              {/* File upload attachment */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={handleFileChange}
                className="hidden"
                disabled={isUploading}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="flex items-center space-x-1 rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition disabled:opacity-50"
                title="Attach document (PDF, TXT, DOCX)"
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-gray-600" />
                ) : (
                  <Paperclip className="h-4 w-4" />
                )}
              </button>

              {/* RAG Knowledge base status pill */}
              {documentCount > 0 && (
                <button
                  type="button"
                  onClick={onToggleRag}
                  className={`flex items-center space-x-1 rounded-lg px-2 py-1 text-xs font-medium transition ${
                    enableRag
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                  title={enableRag ? 'Document grounding enabled' : 'Document grounding disabled'}
                >
                  <BookOpen className="h-3 w-3" />
                  <span>RAG</span>
                </button>
              )}
            </div>

            {/* Right side: Send or Stop button */}
            <div className="flex items-center space-x-2">
              {isLoading ? (
                <button
                  type="button"
                  onClick={onStopGeneration}
                  className="flex h-8 w-8 items-center justify-center rounded-xl bg-gray-900 text-white hover:bg-black transition"
                  title="Stop generation"
                >
                  <Square className="h-3.5 w-3.5 fill-current" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="flex h-8 w-8 items-center justify-center rounded-xl bg-gray-900 text-white hover:bg-black disabled:bg-gray-200 disabled:text-gray-400 transition"
                  title="Send message"
                >
                  <ArrowUp className="h-4 w-4 stroke-[2.5]" />
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
