import os
import shutil
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from rag_pipeline import (
    build_vectorstore,
    get_rag_chain,
    vectorstore_exists
)

load_dotenv()

app = FastAPI(
    title="DocuMind RAG API",
    description="Ask questions over your documents using RAG + Claude AI",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Cache the chain after first load
_chain = None

def get_chain():
    global _chain
    if _chain is None:
        _chain = get_rag_chain()
    return _chain


class QueryRequest(BaseModel):
    question: str


class QueryResponse(BaseModel):
    answer: str
    sources: list[str]
    chunks_used: int


@app.get("/")
def root():
    return {
        "status": "live",
        "project": "DocuMind RAG",
        "docs": "/docs",
        "vectorstore_ready": vectorstore_exists()
    }


@app.get("/health")
def health():
    return {"status": "ok", "vectorstore_ready": vectorstore_exists()}


@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    """Upload a PDF and index it into ChromaDB."""
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    upload_path = f"/tmp/{file.filename}"
    with open(upload_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    try:
        build_vectorstore(upload_path)
        # Reset chain so it reloads with new data
        global _chain
        _chain = None
        return {"message": f"✅ '{file.filename}' indexed successfully. You can now ask questions."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Indexing failed: {str(e)}")


@app.post("/ask", response_model=QueryResponse)
def ask(req: QueryRequest):
    """Ask a question over the indexed documents."""
    if not req.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    if not vectorstore_exists():
        raise HTTPException(
            status_code=400,
            detail="No documents indexed yet. Upload a PDF first using /upload."
        )

    try:
        chain = get_chain()
        result = chain({"query": req.question})

        sources = list(set([
            os.path.basename(doc.metadata.get("source", "unknown"))
            for doc in result["source_documents"]
        ]))

        return QueryResponse(
            answer=result["result"],
            sources=sources,
            chunks_used=len(result["source_documents"])
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
