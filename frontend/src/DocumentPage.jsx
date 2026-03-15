import { useState, useEffect, useCallback, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { getStatus, getSummary, askQuestion } from './api';

function StatusPoller({ docId, onReady, onError }) {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const dotInterval = setInterval(() => {
      setDots((d) => (d.length >= 3 ? '' : d + '.'));
    }, 500);
    return () => clearInterval(dotInterval);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const { status, audioUrl } = await getStatus(docId);
        if (cancelled) return;

        if (status === 'ready') {
          onReady(audioUrl);
        } else if (status === 'error') {
          onError('Processing failed. Please try uploading again.');
        }
      } catch {
        if (!cancelled) {
          onError('Unable to check document status. Please try again.');
        }
      }
    };

    poll();
    const interval = setInterval(poll, 3000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [docId, onReady, onError]);

  return (
    <div className="status-poller">
      <div className="pulse-ring" />
      <p className="status-text">Extracting text & generating audio{dots}</p>
      <p className="status-hint">This usually takes 30–60 seconds</p>
    </div>
  );
}

function AudioPlayer({ audioUrl }) {
  return (
    <div className="audio-player-container">
      <h3 className="section-label">Audio Narration</h3>
      <div className="audio-card">
        <audio controls src={audioUrl} className="audio-element">
          Your browser does not support the audio element.
        </audio>
      </div>
    </div>
  );
}

function SummarySection({ docId }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const fetched = useRef(false);

  const fetchSummary = useCallback(async () => {
    if (fetched.current) return;
    setLoading(true);
    setError(null);
    try {
      const text = await getSummary(docId);
      setSummary(text);
      fetched.current = true;
    } catch {
      setError('Failed to generate summary. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [docId]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return (
    <div className="summary-section">
      {loading && (
        <div className="loading-inline">
          <div className="spinner spinner--sm" />
          <span>Generating summary...</span>
        </div>
      )}

      {error && (
        <div className="error-banner error-banner--sm">
          <span>{error}</span>
          <button className="btn btn-ghost btn-sm" onClick={() => { fetched.current = false; fetchSummary(); }}>
            Retry
          </button>
        </div>
      )}

      {summary && (
        <div className="markdown-body fade-in">
          <ReactMarkdown>{summary}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}

function QASection({ docId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(async () => {
    const question = input.trim();
    if (!question || loading) return;

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text: question }]);
    setLoading(true);

    try {
      const answer = await askQuestion(docId, question);
      setMessages((prev) => [...prev, { role: 'assistant', text: answer }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'error', text: 'Failed to get an answer. Please try again.' },
      ]);
    } finally {
      setLoading(false);
    }
  }, [docId, input, loading]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  return (
    <div className="qa-section">
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-empty">
            <p>Ask anything about your document</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`chat-bubble chat-bubble--${msg.role}`}>
            {msg.role === 'user' ? (
              <p>{msg.text}</p>
            ) : msg.role === 'error' ? (
              <p className="chat-error">{msg.text}</p>
            ) : (
              <div className="markdown-body">
                <ReactMarkdown>{msg.text}</ReactMarkdown>
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="chat-bubble chat-bubble--assistant">
            <div className="typing-indicator">
              <span /><span /><span />
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      <div className="chat-input-row">
        <input
          type="text"
          className="chat-input"
          placeholder="Ask a question about your document..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
        />
        <button
          className="btn btn-primary btn-send"
          onClick={handleSend}
          disabled={!input.trim() || loading}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default function DocumentPage({ docId, pdfUrl, onReset }) {
  const [ready, setReady] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [error, setError] = useState(null);

  const handleReady = useCallback((audio) => {
    setAudioUrl(audio);
    setReady(true);
  }, []);

  const handleError = useCallback((msg) => {
    setError(msg);
  }, []);

  return (
    <div className="document-page">
      <header className="doc-header">
        <button className="btn btn-ghost" onClick={onReset}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          New Document
        </button>
        <h2 className="doc-title">ReadAssist</h2>
        <div style={{ width: 130 }} />
      </header>

      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button className="btn btn-ghost btn-sm" onClick={onReset}>
            Try Again
          </button>
        </div>
      )}

      {!ready && !error && <StatusPoller docId={docId} onReady={handleReady} onError={handleError} />}

      {ready && (
        <div className="doc-content fade-in">
          <section className="reader-section">
            <div className="pdf-viewer-container">
              <h3 className="section-label">Document</h3>
              <div className="pdf-viewer-card">
                {pdfUrl ? (
                  <iframe
                    src={pdfUrl}
                    className="pdf-iframe"
                    title="PDF Document"
                  />
                ) : (
                  <div className="pdf-unavailable">
                    <p>PDF preview not available</p>
                  </div>
                )}
              </div>
            </div>
            <AudioPlayer audioUrl={audioUrl} />
          </section>

          <section className="section-block">
            <h3 className="section-label">Summary</h3>
            <SummarySection docId={docId} />
          </section>

          <section className="section-block">
            <h3 className="section-label">Ask Questions</h3>
            <QASection docId={docId} />
          </section>
        </div>
      )}
    </div>
  );
}
