import React, { useState, useRef } from 'react';
import { 
  X, 
  UploadCloud, 
  FileText, 
  Trash2, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Eye
} from 'lucide-react';
import { uploadDocument, deleteDocument, fetchDocumentChunks, searchDocuments } from '../services/api.js';

export const KnowledgeBaseDrawer = ({
  isOpen,
  onClose,
  documents = [],
  onDocumentsUpdated,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(null);

  // Chunk inspection state
  const [inspectDoc, setInspectDoc] = useState(null);
  const [inspectChunks, setInspectChunks] = useState([]);
  const [isLoadingChunks, setIsLoadingChunks] = useState(false);

  // Semantic search test state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState(null);

  const fileInputRef = useRef(null);

  const handleFiles = async (files) => {
    if (!files || files.length === 0) return;
    const file = files[0];

    const validExtensions = ['.pdf', '.docx', '.txt'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!validExtensions.includes(ext)) {
      setUploadError('Unsupported format. Please upload PDF, DOCX, or TXT documents.');
      setTimeout(() => setUploadError(null), 4000);
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setUploadError('Document exceeds 15MB file limit.');
      setTimeout(() => setUploadError(null), 4000);
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      const res = await uploadDocument(file);
      setIsUploading(false);
      setUploadSuccess(`Successfully indexed "${res.document.filename}" (${res.document.chunkCount} chunks)`);
      onDocumentsUpdated?.();
      setTimeout(() => setUploadSuccess(null), 4000);
    } catch (err) {
      setIsUploading(false);
      setUploadError(err.message || 'Failed to index document.');
      setTimeout(() => setUploadError(null), 4000);
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete "${name}" and its indexed vector chunks?`)) return;
    try {
      await deleteDocument(id);
      onDocumentsUpdated?.();
      if (inspectDoc?.id === id) {
        setInspectDoc(null);
        setInspectChunks([]);
      }
    } catch (err) {
      alert(`Deletion failed: ${err.message}`);
    }
  };

  const handleInspect = async (doc) => {
    setInspectDoc(doc);
    setIsLoadingChunks(true);
    try {
      const data = await fetchDocumentChunks(doc.id);
      setInspectChunks(data.chunks || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingChunks(false);
    }
  };

  const handleTestSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const data = await searchDocuments(searchQuery.trim(), 4, 0.20);
      setSearchResults(data.results);
    } catch (err) {
      alert(err.message || 'Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop for mobile */}
      <div 
        className="fixed inset-0 z-40 bg-black/20 lg:hidden" 
        onClick={onClose} 
      />

      {/* Drawer Panel */}
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col border-l border-gray-200 bg-white shadow-lg transition-transform duration-200 ease-in-out sm:max-w-md">
        {/* Header */}
        <div className="flex h-14 items-center justify-between border-b border-gray-200 px-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Knowledge Base</h2>
            <p className="text-[11px] text-gray-500">Document RAG retrieval</p>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
            title="Close panel"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Dropzone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              handleFiles(e.dataTransfer.files);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-5 text-center cursor-pointer transition ${
              isDragging
                ? 'border-gray-500 bg-gray-50'
                : 'border-gray-300 bg-gray-50/70 hover:border-gray-400 hover:bg-gray-50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={(e) => handleFiles(e.target.files)}
              className="hidden"
            />
            {isUploading ? (
              <Loader2 className="mb-2 h-7 w-7 animate-spin text-gray-600" />
            ) : (
              <UploadCloud className="mb-2 h-7 w-7 text-gray-400" />
            )}
            <div className="text-xs font-semibold text-gray-800">
              {isUploading ? 'Extracting & Indexing document...' : 'Upload document'}
            </div>
            <p className="mt-1 text-[11px] text-gray-500">
              PDF, DOCX, or TXT (up to 15MB)
            </p>
          </div>

          {/* Feedback messages */}
          {uploadError && (
            <div className="flex items-center space-x-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
              <span>{uploadError}</span>
            </div>
          )}

          {uploadSuccess && (
            <div className="flex items-center space-x-2 rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 text-xs text-emerald-800">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>{uploadSuccess}</span>
            </div>
          )}

          {/* Documents list */}
          <div>
            <div className="mb-2 flex items-center justify-between text-xs font-semibold text-gray-700">
              <span>Indexed Documents ({documents.length})</span>
            </div>

            {documents.length === 0 ? (
              <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-5 text-center text-xs text-gray-500">
                <FileText className="mx-auto mb-1.5 h-6 w-6 text-gray-400" />
                No documents uploaded yet.
              </div>
            ) : (
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-2.5 shadow-xs"
                  >
                    <div className="flex items-center space-x-2.5 truncate pr-2">
                      <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-gray-700 uppercase">
                        {doc.fileType}
                      </span>
                      <div className="truncate">
                        <div className="truncate text-xs font-medium text-gray-800">
                          {doc.filename}
                        </div>
                        <div className="text-[10px] text-gray-400">
                          {(doc.size / 1024).toFixed(0)} KB • {doc.chunkCount} chunks
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1 shrink-0">
                      <button
                        onClick={() => handleInspect(doc)}
                        className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
                        title="Inspect Chunks"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(doc.id, doc.filename)}
                        className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 transition"
                        title="Delete Document"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Semantic Search Sandbox */}
          {documents.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
              <div className="mb-2 text-xs font-semibold text-gray-700">
                Test Semantic Search
              </div>
              <form onSubmit={handleTestSearch} className="flex space-x-1.5">
                <input
                  type="text"
                  placeholder="Query knowledge base..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs text-gray-800 focus:border-gray-400 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={isSearching || !searchQuery.trim()}
                  className="rounded-md bg-gray-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-black disabled:opacity-50"
                >
                  {isSearching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Search'}
                </button>
              </form>

              {searchResults && (
                <div className="mt-2.5 space-y-1.5 border-t border-gray-200 pt-2">
                  <div className="flex items-center justify-between text-[10px] text-gray-500">
                    <span>Results ({searchResults.length})</span>
                    <button
                      onClick={() => setSearchResults(null)}
                      className="hover:text-gray-800"
                    >
                      Clear
                    </button>
                  </div>
                  {searchResults.length === 0 ? (
                    <div className="text-[11px] text-gray-500 italic">No matches found.</div>
                  ) : (
                    searchResults.map((r, i) => (
                      <div key={i} className="rounded border border-gray-200 bg-white p-2 text-xs">
                        <div className="flex items-center justify-between text-[10px] font-medium text-gray-600 mb-1">
                          <span className="truncate">{r.documentName}</span>
                          <span className="text-gray-900 font-semibold font-mono">
                            {(r.similarity * 100).toFixed(0)}%
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-600 line-clamp-2">
                          "{r.text}"
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Chunk Viewer Modal */}
        {inspectDoc && (
          <div className="absolute inset-0 z-50 flex flex-col bg-white p-4">
            <div className="flex items-center justify-between border-b border-gray-200 pb-2.5 mb-3">
              <div>
                <h3 className="text-xs font-semibold text-gray-900 truncate max-w-[240px]">
                  {inspectDoc.filename}
                </h3>
                <p className="text-[10px] text-gray-500">
                  {inspectDoc.chunkCount} chunks • {inspectDoc.pageCount} pages
                </p>
              </div>
              <button
                onClick={() => setInspectDoc(null)}
                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2">
              {isLoadingChunks ? (
                <div className="flex items-center justify-center py-8 text-xs text-gray-500">
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Loading chunks...
                </div>
              ) : inspectChunks.map((chunk, idx) => (
                <div key={chunk.id || idx} className="rounded-md border border-gray-200 bg-gray-50 p-2 text-xs">
                  <div className="text-[10px] font-semibold text-gray-500 mb-1">
                    Chunk #{chunk.chunkIndex + 1} (Page {chunk.pageNumber})
                  </div>
                  <p className="text-[11px] text-gray-700 leading-relaxed">
                    {chunk.snippet}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
};
