import { useState, useCallback } from 'react';
import UploadPage from './UploadPage';
import DocumentPage from './DocumentPage';

export default function App() {
  const [docId, setDocId] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);

  const handleDocReady = useCallback((id, url) => {
    setDocId(id);
    setPdfUrl(url);
  }, []);

  const handleReset = useCallback(() => {
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    setDocId(null);
    setPdfUrl(null);
  }, [pdfUrl]);

  return (
    <div className="app">
      {docId ? (
        <DocumentPage docId={docId} pdfUrl={pdfUrl} onReset={handleReset} />
      ) : (
        <UploadPage onDocReady={handleDocReady} />
      )}
    </div>
  );
}
