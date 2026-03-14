import { useState, useCallback } from 'react';
import { submitPdf } from './api';

export default function UploadPage({ onDocReady }) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [fileName, setFileName] = useState(null);

  const handleFile = useCallback(async (file) => {
    if (!file || file.type !== 'application/pdf') {
      setError('Please select a valid PDF file.');
      return;
    }
    setError(null);
    setFileName(file.name);
    setUploading(true);

    try {
      const s3Key = `uploads/${Date.now()}-${file.name}`;
      const docId = await submitPdf(s3Key, file.name);
      onDocReady(docId);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Something went wrong while processing your PDF. Please try again.'
      );
      setUploading(false);
    }
  }, [onDocReady]);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  }, [handleFile]);

  const onDragOver = useCallback((e) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const onDragLeave = useCallback(() => {
    setDragging(false);
  }, []);

  const onFileSelect = useCallback((e) => {
    const file = e.target.files[0];
    handleFile(file);
  }, [handleFile]);

  return (
    <div className="upload-page">
      <div className="hero">
        <h1 className="hero-title">ReadAssist</h1>
        <p className="hero-tagline">
          Turn any PDF into audio, summaries, and answers
        </p>
      </div>

      <div
        className={`drop-zone ${dragging ? 'drop-zone--active' : ''} ${uploading ? 'drop-zone--uploading' : ''}`}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => !uploading && document.getElementById('file-input').click()}
      >
        <input
          id="file-input"
          type="file"
          accept="application/pdf"
          onChange={onFileSelect}
          hidden
        />

        {uploading ? (
          <div className="upload-progress">
            <div className="spinner" />
            <p className="upload-progress-text">
              Processing <strong>{fileName}</strong>...
            </p>
          </div>
        ) : (
          <>
            <div className="drop-zone-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <polyline points="9 15 12 12 15 15" />
              </svg>
            </div>
            <p className="drop-zone-text">
              Drag & drop your PDF here, or <span className="drop-zone-browse">browse</span>
            </p>
            <p className="drop-zone-hint">Supports PDF files</p>
          </>
        )}
      </div>

      {error && (
        <div className="error-banner">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
