from server import rebuild_index


if __name__ == "__main__":
  stats = rebuild_index()
  print(f"Indexed {stats['total_chunks']} chunks from {stats['total_documents']} documents.")
