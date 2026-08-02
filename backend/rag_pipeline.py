import os
from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain_anthropic import ChatAnthropic
from langchain.chains import RetrievalQA
from langchain.prompts import PromptTemplate
from sklearn.feature_extraction.text import HashingVectorizer

CHROMA_PATH = "./chroma_db"
N_FEATURES = 512  # fixed vector size, keeps memory low and avoids needing to persist a vocabulary

RAG_PROMPT = PromptTemplate(
    input_variables=["context", "question"],
    template="""You are a helpful assistant that answers questions based on the provided document context.

Context from documents:
{context}

Question: {question}

Answer clearly and concisely based only on the context above. If the answer is not in the context, say "I couldn't find that in the uploaded documents."

Answer:"""
)


class LightweightEmbeddings:
    """
    Local, dependency-light embeddings using scikit-learn's HashingVectorizer.

    Why not sentence-transformers: that pulls in torch (500MB+), which exceeds
    Render's free-tier 512MB RAM limit and crashes the process on load.
    Why not a hosted embeddings API: avoids requiring a third-party API key
    and any dependency on external service uptime/billing for a demo project.

    Tradeoff: HashingVectorizer captures lexical (word-overlap) similarity,
    not deep semantic similarity. Retrieval will be weaker on paraphrased
    questions that don't share vocabulary with the source text, but it is
    zero-cost, stateless (no vocabulary to persist), and reliably fits in
    memory. Documented here and in DECISIONS.md as an explicit, revisitable
    tradeoff.
    """

    def __init__(self, n_features: int = N_FEATURES):
        self.vectorizer = HashingVectorizer(
            n_features=n_features,
            alternate_sign=False,
            norm="l2"
        )

    def embed_documents(self, texts):
        vectors = self.vectorizer.transform(texts)
        return vectors.toarray().tolist()

    def embed_query(self, text):
        vector = self.vectorizer.transform([text])
        return vector.toarray()[0].tolist()


def get_embeddings():
    return LightweightEmbeddings()


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
