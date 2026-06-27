"""
Run this script once to index the sample PDF into ChromaDB.
Usage: python ingest.py [optional: path/to/your.pdf]
"""
import sys
import os
from dotenv import load_dotenv
from rag_pipeline import build_vectorstore

load_dotenv()

if __name__ == "__main__":
    pdf_path = sys.argv[1] if len(sys.argv) > 1 else "../data/sample.pdf"

    if not os.path.exists(pdf_path):
        print(f"❌ File not found: {pdf_path}")
        sys.exit(1)

    print(f"📄 Ingesting: {pdf_path}")
    build_vectorstore(pdf_path)
    print("🎉 Done! ChromaDB is ready. Run: uvicorn main:app --reload")
