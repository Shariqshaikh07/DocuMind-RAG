import os
from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_anthropic import ChatAnthropic
from langchain.chains import RetrievalQA
from langchain.prompts import PromptTemplate

CHROMA_PATH = "./chroma_db"
EMBED_MODEL = "all-MiniLM-L6-v2"

RAG_PROMPT = PromptTemplate(
    input_variables=["context", "question"],
    template="""You are a helpful assistant that answers questions based on the provided document context.

Context from documents:
{context}

Question: {question}

Answer clearly and concisely based only on the context above. If the answer is not in the context, say "I couldn't find that in the uploaded documents."

Answer:"""
)


def get_embeddings():
    return HuggingFaceEmbeddings(model_name=EMBED_MODEL)


def build_vectorstore(pdf_path: str) -> Chroma:
    """Ingest a PDF and store embeddings in ChromaDB."""
    loader = PyPDFLoader(pdf_path)
    docs = loader.load()

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=50,
        separators=["\n\n", "\n", ".", " "]
    )
    chunks = splitter.split_documents(docs)

    embeddings = get_embeddings()
    vectorstore = Chroma.from_documents(
        chunks,
        embeddings,
        persist_directory=CHROMA_PATH
    )
    vectorstore.persist()
    print(f"✅ Indexed {len(chunks)} chunks from {pdf_path}")
    return vectorstore


def load_vectorstore() -> Chroma:
    """Load existing ChromaDB vectorstore."""
    embeddings = get_embeddings()
    return Chroma(
        persist_directory=CHROMA_PATH,
        embedding_function=embeddings
    )


def get_rag_chain() -> RetrievalQA:
    """Build the full RAG chain: retriever + LLM."""
    vectorstore = load_vectorstore()
    llm = ChatAnthropic(
        model="claude-haiku-4-5",
        anthropic_api_key=os.getenv("ANTHROPIC_API_KEY"),
        max_tokens=1024,
        temperature=0.2
    )
    chain = RetrievalQA.from_chain_type(
        llm=llm,
        chain_type="stuff",
        retriever=vectorstore.as_retriever(search_kwargs={"k": 4}),
        return_source_documents=True,
        chain_type_kwargs={"prompt": RAG_PROMPT}
    )
    return chain


def vectorstore_exists() -> bool:
    """Check if a ChromaDB store has been built."""
    return os.path.exists(CHROMA_PATH) and len(os.listdir(CHROMA_PATH)) > 0
