import { useCallback, useEffect, useState } from "react";

const fmt = (iso) => (iso ? new Date(iso).toLocaleString("es-CO") : "—");

export default function App({ apiUrl }) {
  const [todos, setTodos] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [error, setError] = useState("");

  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [history, setHistory] = useState([]);
  const [detailStatus, setDetailStatus] = useState("idle");

  // GET /todos
  const loadTodos = useCallback(async () => {
    setStatus("loading");
    try {
      const res = await fetch(apiUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setTodos(await res.json());
      setStatus("ready");
    } catch (err) {
      setError(err.message);
      setStatus("error");
    }
  }, [apiUrl]);

  // GET /todos/{id} + GET /todos/{id}/history
  const loadDetail = useCallback(
    async (id) => {
      setDetailStatus("loading");
      try {
        const [resTodo, resHistory] = await Promise.all([
          fetch(`${apiUrl}/${id}`),
          fetch(`${apiUrl}/${id}/history`),
        ]);
        if (resTodo.status === 404) {
          setDetailStatus("notfound");
          return;
        }
        if (!resTodo.ok || !resHistory.ok) throw new Error("Error al cargar el detalle");
        setDetail(await resTodo.json());
        setHistory(await resHistory.json());
        setDetailStatus("ready");
      } catch {
        setDetailStatus("error");
      }
    },
    [apiUrl]
  );

  // Carga inicial
  useEffect(() => {
    loadTodos();
  }, [loadTodos]);

  // Escucha los eventos del editor
  useEffect(() => {
    const onCreated = () => loadTodos();
    const onUpdated = (e) => {
      loadTodos();
      // El historial llega por SNS/SQS con un pequeño retraso (consistencia eventual)
      if (e.detail?.id === selectedId) setTimeout(() => loadDetail(selectedId), 1500);
    };
    const onDeleted = (e) => {
      loadTodos();
      if (e.detail?.id === selectedId) {
        setSelectedId(null);
        setDetail(null);
        setHistory([]);
        setDetailStatus("idle");
      }
    };

    window.addEventListener("todo:created", onCreated);
    window.addEventListener("todo:updated", onUpdated);
    window.addEventListener("todo:deleted", onDeleted);
    return () => {
      window.removeEventListener("todo:created", onCreated);
      window.removeEventListener("todo:updated", onUpdated);
      window.removeEventListener("todo:deleted", onDeleted);
    };
  }, [loadTodos, loadDetail, selectedId]);

  // Clic en una tarea: carga el detalle y avisa al editor
  const select = (id) => {
    setSelectedId(id);
    loadDetail(id);
    window.dispatchEvent(new CustomEvent("todo:selected", { detail: { id } }));
  };

  return (
    <div className="panel">
      <div className="head">
        <h2>🔍 Tareas</h2>
        <button onClick={loadTodos}>Actualizar</button>
      </div>

      {status === "loading" && <p className="state">Cargando tareas…</p>}
      {status === "error" && <p className="error">No se pudieron cargar las tareas: {error}</p>}
      {status === "ready" && todos.length === 0 && (
        <p className="state">No hay tareas. Crea una desde el editor.</p>
      )}

      {status === "ready" && todos.length > 0 && (
        <ul>
          {todos.map((t) => (
            <li key={t.id}>
              <button
                className={`todo ${t.id === selectedId ? "selected" : ""} ${t.completed ? "done" : ""}`}
                onClick={() => select(t.id)}
              >
                <span>{t.completed ? "✅" : "⬜"}</span>
                <span className="title">{t.title}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {selectedId && (
        <div className="detail">
          {detailStatus === "loading" && <p className="state">Cargando detalle…</p>}
          {detailStatus === "notfound" && <p className="error">La tarea ya no existe (404).</p>}
          {detailStatus === "error" && <p className="error">No se pudo cargar el detalle.</p>}
          {detailStatus === "ready" && detail && (
            <>
              <h3>Detalle</h3>
              <p><strong>{detail.title}</strong></p>
              <p className="state">
                Estado: {detail.completed ? "Completada" : "Pendiente"} · Creada: {fmt(detail.createdAt)} ·
                Actualizada: {fmt(detail.updatedAt)}
              </p>

              <h3>Historial de eventos</h3>
              {history.length === 0 ? (
                <p className="state">Sin eventos todavía (pueden tardar unos segundos).</p>
              ) : (
                <ul className="history">
                  {history.map((h, i) => (
                    <li key={i}>
                      <span className="badge">{h.eventType}</span>
                      {fmt(h.occurredAt)}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}