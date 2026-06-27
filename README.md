# ◈ DocuMind RAG

> Ask questions over any PDF using **Retrieval-Augmented Generation** — built with LangChain, ChromaDB, and Claude AI.

**Live Demo:** `https://your-frontend.vercel.app` &nbsp;|&nbsp; **API Docs:** `https://your-backend.onrender.com/docs`

---

## Architecture

```
 PDF Upload
     │
     ▼
┌─────────────────┐
│  PyPDF Loader   │  ← Extracts text from PDF
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Text Splitter   │  ← Chunks: 500 tokens, 50 overlap
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ HuggingFace     │  ← all-MiniLM-L6-v2 embeddings
│ Embeddings      │     (free, runs locally)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   ChromaDB      │  ← Persistent vector store
│  (Vector Store) │
└────────┬────────┘
         │  top-k=4 similarity search
         ▼
┌─────────────────┐
│  Claude Haiku   │  ← Generates grounded answer
│   (claude AI)   │     with source attribution
└─────────────────┘
```

## Tech Stack

| Layer | Technology |
|---|---|
| **LLM** | Claude Haiku (Anthropic) |
| **Orchestration** | LangChain RetrievalQA |
| **Vector Store** | ChromaDB (persistent) |
| **Embeddings** | HuggingFace `all-MiniLM-L6-v2` |
| **Backend** | FastAPI + Uvicorn |
| **Frontend** | React 18 |
| **Deploy (API)** | Render.com |
| **Deploy (UI)** | Vercel |

---

## Local Setup

### 1. Clone & configure

```bash
git clone https://github.com/Shariqshaikh07/documind-rag.git
cd documind-rag
```

### 2. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# Add your ANTHROPIC_API_KEY to .env

# Index the sample PDF
python ingest.py ../data/sample.pdf

# Start API
uvicorn main:app --reload
# → http://localhost:8000
# → http://localhost:8000/docs  (Swagger UI)
```

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env            # Set REACT_APP_API_URL=http://localhost:8000
npm start
# → http://localhost:3000
```

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Health check + vectorstore status |
| `GET` | `/health` | Liveness probe for Render |
| `POST` | `/upload` | Upload PDF → index into ChromaDB |
| `POST` | `/ask` | Ask a question, get answer + sources |

**POST /ask**
```json
// Request
{ "question": "What is the main topic of this document?" }

// Response
{
  "answer": "The document covers...",
  "sources": ["sample.pdf"],
  "chunks_used": 4
}
```

---

## Deploy

### Backend → Render

1. Push this repo to GitHub
2. Go to [render.com](https://render.com) → New → Web Service
3. Connect repo → Render auto-detects `render.yaml`
4. Add environment variable: `ANTHROPIC_API_KEY`
5. Deploy ✅

### Frontend → Vercel

```bash
cd frontend
npm run build
# Or connect GitHub repo to Vercel
# Set REACT_APP_API_URL = your Render backend URL
```

---

## Project Structure

```
documind-rag/
├── backend/
│   ├── main.py           # FastAPI routes
│   ├── rag_pipeline.py   # LangChain + ChromaDB core
│   ├── ingest.py         # One-time PDF indexing script
│   └── requirements.txt
├── frontend/
│   └── src/App.js        # React chat UI
├── data/
│   └── sample.pdf        # Demo document
├── render.yaml           # Render deployment config
└── README.md
```

---

## Author

**Shariq Shaikh** — [linkedin.com/in/shariq-shaikh-8640b22a6](https://linkedin.com/in/shariq-shaikh-8640b22a6) · [github.com/Shariqshaikh07](https://github.com/Shariqshaikh07)
