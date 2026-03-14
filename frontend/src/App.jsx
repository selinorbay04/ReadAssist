import { useState, useCallback } from 'react';
import UploadPage from './UploadPage';
import DocumentPage from './DocumentPage';

export default function App() {
  const [docId, setDocId] = useState(null);

  const handleDocReady = useCallback((id) => {
    setDocId(id);
  }, []);

  const handleReset = useCallback(() => {
    setDocId(null);
  }, []);

  return (
    <div className="app">
      {docId ? (
        <DocumentPage docId={docId} onReset={handleReset} />
      ) : (
        <UploadPage onDocReady={handleDocReady} />
      )}
    </div>
  );
}
