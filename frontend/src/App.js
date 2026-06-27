import React, { useState, useRef, useEffect } from "react";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

const SendIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

const UploadIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

const BotIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="10" rx="2" />
    <circle cx="12" cy="5" r="2" />
    <path d="M12 7v4" />
    <line x1="8" y1="16" x2="8" y2="16" strokeWidth="3" />
    <line x1="16" y1="16" x2="16" y2="16" strokeWidth="3" />
  </svg>
);

const DocIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
);

export default function App() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hi! Upload a PDF and I'll answer questions about it using RAG + Claude AI.",
      sources: [],
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${API_URL}/upload`, { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Upload failed");
      setUploadedFile(file.name);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `📄 **${file.name}** indexed successfully. Ask me anything about it!`,
          sources: [],
        },
      ]);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleAsk = async () => {
    if (!input.trim() || loading) return;
    const question = input.trim();
    setInput("");
    setError(null);
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Request failed");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.answer,
          sources: data.sources,
          chunks: data.chunks_used,
        },
      ]);
    } catch (err) {
      setError(err.message);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `⚠️ ${err.message}`, sources: [] },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAsk();
    }
  };

  return (
    <div style={styles.root}>
      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <div style={styles.logo}>
          <span style={styles.logoMark}>◈</span>
          <span style={styles.logoText}>DocuMind</span>
        </div>
        <p style={styles.tagline}>RAG · LangChain · ChromaDB · Claude</p>

        <div style={styles.divider} />

        <div style={styles.uploadZone} onClick={() => fileRef.current.click()}>
          <UploadIcon />
          <span style={{ marginLeft: 8 }}>
            {uploading ? "Indexing…" : "Upload PDF"}
          </span>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf"
          style={{ display: "none" }}
          onChange={handleUpload}
        />

        {uploadedFile && (
          <div style={styles.fileChip}>
            <DocIcon />
            <span style={{ marginLeft: 6, fontSize: 12 }}>{uploadedFile}</span>
          </div>
        )}

        <div style={styles.divider} />

        <div style={styles.howItWorks}>
          <p style={styles.howTitle}>How it works</p>
          <ol style={styles.howList}>
            <li>Upload a PDF</li>
            <li>Splits into chunks</li>
            <li>Embedded → ChromaDB</li>
            <li>Top-k chunks retrieved</li>
            <li>Claude generates answer</li>
          </ol>
        </div>

        <div style={styles.sidebarFooter}>
          <a href="https://github.com/Shariqshaikh07" target="_blank" rel="noreferrer" style={styles.link}>
            github.com/Shariqshaikh07
          </a>
        </div>
      </aside>

      {/* Chat area */}
      <main style={styles.main}>
        <div style={styles.messages}>
          {messages.map((msg, i) => (
            <div key={i} style={msg.role === "user" ? styles.userRow : styles.botRow}>
              {msg.role === "assistant" && (
                <div style={styles.botAvatar}><BotIcon /></div>
              )}
              <div style={msg.role === "user" ? styles.userBubble : styles.botBubble}>
                <p style={styles.msgText}>{msg.content}</p>
                {msg.sources && msg.sources.length > 0 && (
                  <div style={styles.sources}>
                    <span style={styles.sourceLabel}>Sources:</span>
                    {msg.sources.map((s, j) => (
                      <span key={j} style={styles.sourceChip}>
                        <DocIcon /> {s}
                      </span>
                    ))}
                    {msg.chunks && (
                      <span style={styles.chunkBadge}>{msg.chunks} chunks</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div style={styles.botRow}>
              <div style={styles.botAvatar}><BotIcon /></div>
              <div style={styles.botBubble}>
                <div style={styles.typing}>
                  <span /><span /><span />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {error && <div style={styles.errorBanner}>{error}</div>}

        <div style={styles.inputRow}>
          <textarea
            style={styles.textarea}
            rows={1}
            placeholder="Ask a question about your document…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
          />
          <button
            style={{
              ...styles.sendBtn,
              opacity: loading || !input.trim() ? 0.4 : 1,
            }}
            onClick={handleAsk}
            disabled={loading || !input.trim()}
          >
            <SendIcon />
          </button>
        </div>
      </main>

      <style>{`
        @keyframes blink {
          0%, 80%, 100% { opacity: 0; }
          40% { opacity: 1; }
        }
        .typing-dot { animation: blink 1.4s infinite both; }
        .typing-dot:nth-child(2) { animation-delay: 0.2s; }
        .typing-dot:nth-child(3) { animation-delay: 0.4s; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0f1117; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #2a2d3a; border-radius: 4px; }
      `}</style>
    </div>
  );
}

const styles = {
  root: {
    display: "flex",
    height: "100vh",
    fontFamily: "'Inter', sans-serif",
    background: "#0f1117",
    color: "#e2e8f0",
  },
  sidebar: {
    width: 240,
    background: "#161822",
    borderRight: "1px solid #1e2030",
    display: "flex",
    flexDirection: "column",
    padding: "24px 16px",
    gap: 12,
    flexShrink: 0,
  },
  logo: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  logoMark: {
    fontSize: 22,
    color: "#7c6af7",
  },
  logoText: {
    fontSize: 17,
    fontWeight: 600,
    letterSpacing: "-0.5px",
    color: "#f0f0f5",
  },
  tagline: {
    fontSize: 10,
    color: "#4a4f6a",
    fontFamily: "'JetBrains Mono', monospace",
    letterSpacing: "0.5px",
  },
  divider: {
    height: 1,
    background: "#1e2030",
    margin: "4px 0",
  },
  uploadZone: {
    display: "flex",
    alignItems: "center",
    padding: "10px 12px",
    background: "#1e2234",
    border: "1px dashed #3a3f5c",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 13,
    color: "#8b92b8",
    transition: "all 0.15s",
  },
  fileChip: {
    display: "flex",
    alignItems: "center",
    padding: "6px 10px",
    background: "#1a1f35",
    border: "1px solid #2a2f4a",
    borderRadius: 6,
    color: "#7c6af7",
    overflow: "hidden",
  },
  howItWorks: {
    flex: 1,
  },
  howTitle: {
    fontSize: 11,
    color: "#4a4f6a",
    textTransform: "uppercase",
    letterSpacing: "1px",
    marginBottom: 10,
  },
  howList: {
    paddingLeft: 16,
    fontSize: 12,
    color: "#5a6080",
    lineHeight: "1.9",
  },
  sidebarFooter: {
    marginTop: "auto",
  },
  link: {
    fontSize: 11,
    color: "#4a4f6a",
    textDecoration: "none",
    fontFamily: "'JetBrains Mono', monospace",
  },
  main: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  messages: {
    flex: 1,
    overflowY: "auto",
    padding: "32px 40px",
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },
  userRow: {
    display: "flex",
    justifyContent: "flex-end",
  },
  botRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
  },
  botAvatar: {
    width: 30,
    height: 30,
    background: "#2a1f5c",
    border: "1px solid #3d2f8a",
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    color: "#7c6af7",
  },
  userBubble: {
    maxWidth: "65%",
    background: "#7c6af7",
    borderRadius: "14px 14px 2px 14px",
    padding: "12px 16px",
  },
  botBubble: {
    maxWidth: "72%",
    background: "#161e2e",
    border: "1px solid #1e2840",
    borderRadius: "2px 14px 14px 14px",
    padding: "12px 16px",
  },
  msgText: {
    fontSize: 14,
    lineHeight: 1.65,
    color: "#dde3f0",
    whiteSpace: "pre-wrap",
  },
  sources: {
    marginTop: 10,
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
  },
  sourceLabel: {
    fontSize: 11,
    color: "#4a5070",
    marginRight: 2,
  },
  sourceChip: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    fontSize: 11,
    padding: "2px 8px",
    background: "#1a2040",
    border: "1px solid #2a3060",
    borderRadius: 4,
    color: "#6a80b0",
    fontFamily: "'JetBrains Mono', monospace",
  },
  chunkBadge: {
    fontSize: 11,
    padding: "2px 8px",
    background: "#1a2a1a",
    border: "1px solid #2a4a2a",
    borderRadius: 4,
    color: "#5a9a5a",
    fontFamily: "'JetBrains Mono', monospace",
  },
  typing: {
    display: "flex",
    gap: 5,
    padding: "4px 0",
  },
  errorBanner: {
    margin: "0 40px 8px",
    padding: "10px 14px",
    background: "#2a1010",
    border: "1px solid #5a1a1a",
    borderRadius: 8,
    fontSize: 13,
    color: "#f08080",
  },
  inputRow: {
    display: "flex",
    alignItems: "flex-end",
    gap: 10,
    padding: "16px 40px 24px",
    borderTop: "1px solid #1a1d2e",
    background: "#0f1117",
  },
  textarea: {
    flex: 1,
    background: "#161822",
    border: "1px solid #252840",
    borderRadius: 10,
    color: "#e2e8f0",
    fontFamily: "'Inter', sans-serif",
    fontSize: 14,
    padding: "12px 16px",
    resize: "none",
    outline: "none",
    lineHeight: 1.5,
  },
  sendBtn: {
    width: 42,
    height: 42,
    background: "#7c6af7",
    border: "none",
    borderRadius: 10,
    color: "#fff",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    transition: "opacity 0.15s",
  },
};
