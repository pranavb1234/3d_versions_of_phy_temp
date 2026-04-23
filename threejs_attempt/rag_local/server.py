import json
import os
import re
from pathlib import Path

import chromadb
import requests
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sentence_transformers import SentenceTransformer

BASE_DIR = Path(__file__).resolve().parent
KNOWLEDGE_PATH = Path(
  os.getenv("RAG_KNOWLEDGE_PATH", str(BASE_DIR / "knowledge" / "templates.json"))
)
CHROMA_DIR = Path(os.getenv("RAG_CHROMA_DIR", str(BASE_DIR / "chroma_store")))
COLLECTION_NAME = os.getenv("RAG_COLLECTION", "physics_lab_templates")
EMBED_MODEL = os.getenv("RAG_EMBED_MODEL", "all-MiniLM-L6-v2")
OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://127.0.0.1:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "").strip()
ALLOWED_ORIGINS = [
  origin.strip()
  for origin in os.getenv(
    "RAG_ALLOWED_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173"
  ).split(",")
  if origin.strip()
]

CHROMA_DIR.mkdir(parents=True, exist_ok=True)

client = chromadb.PersistentClient(path=str(CHROMA_DIR))
collection = client.get_or_create_collection(name=COLLECTION_NAME, metadata={"hnsw:space": "cosine"})
embedder = SentenceTransformer(EMBED_MODEL)


class ChatRequest(BaseModel):
  question: str = Field(min_length=1)
  chapterId: str = Field(min_length=1)
  templateId: str = Field(min_length=1)
  topK: int = Field(default=4, ge=1, le=10)


def chunk_text(text, chunk_size=110, overlap=24):
  words = re.sub(r"\s+", " ", text).strip().split(" ")
  if not words:
    return []

  chunks = []
  start = 0
  while start < len(words):
    end = min(start + chunk_size, len(words))
    chunk = " ".join(words[start:end]).strip()
    if chunk:
      chunks.append(chunk)
    if end >= len(words):
      break
    start = max(end - overlap, start + 1)
  return chunks


def load_knowledge_docs():
  if not KNOWLEDGE_PATH.exists():
    raise FileNotFoundError(f"Knowledge file not found: {KNOWLEDGE_PATH}")
  with KNOWLEDGE_PATH.open("r", encoding="utf-8") as handle:
    docs = json.load(handle)

  if not isinstance(docs, list):
    raise ValueError("Knowledge file must contain a JSON list.")
  return docs


def reset_collection():
  global collection
  try:
    client.delete_collection(COLLECTION_NAME)
  except Exception:
    pass
  collection = client.get_or_create_collection(name=COLLECTION_NAME, metadata={"hnsw:space": "cosine"})


def rebuild_index():
  docs = load_knowledge_docs()
  reset_collection()

  ids = []
  chunk_texts = []
  metadatas = []
  chunk_count = 0

  for doc_index, doc in enumerate(docs):
    chapter_id = str(doc.get("chapterId", "")).strip()
    template_id = str(doc.get("templateId", "")).strip()
    title = str(doc.get("title", "")).strip() or f"{chapter_id}:{template_id}"
    source = str(doc.get("source", "local_notes")).strip()
    content = str(doc.get("content", "")).strip()

    if not chapter_id or not template_id or not content:
      continue

    chunks = chunk_text(content)
    for chunk_index, chunk in enumerate(chunks):
      ids.append(f"{chapter_id}-{template_id}-{doc_index}-{chunk_index}")
      chunk_texts.append(chunk)
      metadatas.append(
        {
          "chapterId": chapter_id,
          "templateId": template_id,
          "title": title,
          "source": source,
          "chunkIndex": chunk_index
        }
      )
      chunk_count += 1

  if not chunk_texts:
    raise ValueError("No chunks were generated. Check the knowledge file content.")

  embeddings = embedder.encode(chunk_texts, normalize_embeddings=True).tolist()
  batch_size = 64
  for start in range(0, len(ids), batch_size):
    end = min(start + batch_size, len(ids))
    collection.upsert(
      ids=ids[start:end],
      embeddings=embeddings[start:end],
      documents=chunk_texts[start:end],
      metadatas=metadatas[start:end]
    )

  return {"total_documents": len(docs), "total_chunks": chunk_count, "collection": COLLECTION_NAME}


def query_chunks(question, chapter_id, template_id, top_k):
  if collection.count() == 0:
    return []

  where_filter = {
    "$and": [
      {"chapterId": {"$eq": chapter_id}},
      {"templateId": {"$eq": template_id}}
    ]
  }

  query_embedding = embedder.encode([question], normalize_embeddings=True).tolist()
  result = collection.query(
    query_embeddings=query_embedding,
    n_results=top_k,
    where=where_filter,
    include=["documents", "metadatas", "distances"]
  )

  documents = (result.get("documents") or [[]])[0]
  metadatas = (result.get("metadatas") or [[]])[0]
  distances = (result.get("distances") or [[]])[0]

  items = []
  for index, text in enumerate(documents):
    if not text:
      continue
    metadata = metadatas[index] if index < len(metadatas) else {}
    distance = distances[index] if index < len(distances) else None
    similarity = max(0.0, 1.0 - float(distance)) if distance is not None else 0.0
    items.append({"text": text, "metadata": metadata, "similarity": similarity})
  return items


def maybe_generate_with_ollama(question, chunks):
  if not OLLAMA_MODEL:
    return None

  context = "\n\n".join([chunk["text"] for chunk in chunks[:4]])
  prompt = (
    "You are a physics tutor for a simulation app. "
    "Answer only from the context below. "
    "If context is insufficient, explicitly say that.\n\n"
    f"Question:\n{question}\n\n"
    f"Context:\n{context}\n\n"
    "Answer in under 6 short lines."
  )

  try:
    response = requests.post(
      f"{OLLAMA_HOST}/api/generate",
      json={"model": OLLAMA_MODEL, "prompt": prompt, "stream": False, "options": {"temperature": 0.2}},
      timeout=80
    )
    response.raise_for_status()
    payload = response.json()
    return str(payload.get("response", "")).strip() or None
  except Exception:
    return None


def build_fallback_answer(chunks):
  if not chunks:
    return (
      "I could not find enough indexed notes for this simulation yet. "
      "Run local indexing first, then ask again."
    )

  lines = ["I found these local notes for this simulation:"]
  for index, chunk in enumerate(chunks[:3]):
    text = chunk["text"]
    if len(text) > 220:
      text = f"{text[:220].rstrip()}..."
    lines.append(f"{index + 1}. {text}")
  lines.append("Ask a narrower question if you want a more specific answer.")
  return "\n".join(lines)


app = FastAPI(title="Local Physics RAG API", version="0.1.0")
app.add_middleware(
  CORSMiddleware,
  allow_origins=ALLOWED_ORIGINS,
  allow_credentials=False,
  allow_methods=["*"],
  allow_headers=["*"]
)


@app.get("/health")
def health():
  return {
    "status": "ok",
    "collection": COLLECTION_NAME,
    "count": collection.count(),
    "embedding_model": EMBED_MODEL,
    "knowledge_path": str(KNOWLEDGE_PATH),
    "allowed_origins": ALLOWED_ORIGINS
  }


@app.post("/index")
def index_docs():
  try:
    return rebuild_index()
  except Exception as exc:
    raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/chat")
def chat(request: ChatRequest):
  question = request.question.strip()
  if not question:
    raise HTTPException(status_code=400, detail="Question cannot be empty.")

  chunks = query_chunks(question, request.chapterId, request.templateId, request.topK)
  ollama_answer = maybe_generate_with_ollama(question, chunks)
  answer = ollama_answer or build_fallback_answer(chunks)

  sources = []
  for chunk in chunks[:4]:
    metadata = chunk["metadata"] or {}
    sources.append(
      {
        "title": metadata.get("title", "local_chunk"),
        "source": metadata.get("source", "local"),
        "chapterId": metadata.get("chapterId", ""),
        "templateId": metadata.get("templateId", ""),
        "similarity": round(float(chunk["similarity"]), 3)
      }
    )

  return {
    "answer": answer,
    "sources": sources,
    "retrieved": len(chunks),
    "generator": "ollama" if ollama_answer else "retrieval_only"
  }
