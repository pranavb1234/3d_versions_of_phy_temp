import { useEffect, useState } from "react";

const LOCAL_RAG_API = import.meta.env.VITE_LOCAL_RAG_API ?? "http://127.0.0.1:8001";

const createGreeting = (label) =>
  `Ask me about "${label}". I answer using only local notes indexed for this simulation.`;

export default function TemplateRagChat({ chapterId, templateId, templateLabel }) {
  const [messages, setMessages] = useState(() => [
    { role: "assistant", text: createGreeting(templateLabel), sources: [] }
  ]);
  const [question, setQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isIndexing, setIsIndexing] = useState(false);
  const [statusText, setStatusText] = useState("Local RAG ready");

  useEffect(() => {
    setMessages([{ role: "assistant", text: createGreeting(templateLabel), sources: [] }]);
    setQuestion("");
    setStatusText("Switched to a new simulation scope.");
  }, [chapterId, templateId, templateLabel]);

  const askQuestion = async () => {
    const nextQuestion = question.trim();
    if (!nextQuestion || isLoading) {
      return;
    }

    setIsLoading(true);
    setStatusText("Searching local vector store...");
    setMessages((prev) => [...prev, { role: "user", text: nextQuestion, sources: [] }]);
    setQuestion("");

    try {
      const response = await fetch(`${LOCAL_RAG_API}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: nextQuestion,
          chapterId,
          templateId,
          topK: 4
        })
      });

      if (!response.ok) {
        throw new Error(`Chat request failed (${response.status})`);
      }

      const payload = await response.json();
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: payload.answer ?? "No answer generated.",
          sources: payload.sources ?? []
        }
      ]);
      setStatusText("Answer generated from local retrieval.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Request failed";
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text:
            "I could not reach the local RAG API. Start the local server and re-run indexing.",
          sources: []
        }
      ]);
      setStatusText(message);
    } finally {
      setIsLoading(false);
    }
  };

  const runIndexing = async () => {
    if (isIndexing) {
      return;
    }
    setIsIndexing(true);
    setStatusText("Building local embeddings and indexing...");
    try {
      const response = await fetch(`${LOCAL_RAG_API}/index`, { method: "POST" });
      if (!response.ok) {
        throw new Error(`Indexing failed (${response.status})`);
      }
      const payload = await response.json();
      setStatusText(
        `Indexed ${payload.total_chunks ?? 0} chunks from ${payload.total_documents ?? 0} docs.`
      );
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : "Indexing failed");
    } finally {
      setIsIndexing(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    askQuestion();
  };

  return (
    <section className="rag-chat-widget" aria-label="Template RAG chat">
      <div className="rag-chat-head">
        <div>
          <div className="rag-chat-title">Local Template Chat</div>
          <div className="rag-chat-scope">
            {chapterId} / {templateId}
          </div>
        </div>
        <button type="button" className="rag-chat-index-btn" onClick={runIndexing}>
          {isIndexing ? "Indexing..." : "Reindex"}
        </button>
      </div>

      <div className="rag-chat-log">
        {messages.map((entry, index) => (
          <div key={`${entry.role}-${index}`} className={`rag-chat-msg ${entry.role}`}>
            <div className="rag-chat-role">{entry.role === "user" ? "You" : "Local RAG"}</div>
            <div className="rag-chat-text">{entry.text}</div>
            {entry.role === "assistant" && entry.sources?.length > 0 ? (
              <div className="rag-chat-sources">
                Sources:{" "}
                {entry.sources
                  .slice(0, 3)
                  .map((source) => source.title || source.templateId || "chunk")
                  .join(" | ")}
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <form className="rag-chat-input-row" onSubmit={handleSubmit}>
        <input
          type="text"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder={`Ask about ${templateLabel}`}
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading || !question.trim()}>
          {isLoading ? "..." : "Ask"}
        </button>
      </form>
      <div className="rag-chat-status">{statusText}</div>
    </section>
  );
}
