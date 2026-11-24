import { LitElement, html, css } from "lit";

class TodoEditor extends LitElement {
  static properties = {
    apiUrl: { type: String, attribute: "api-url" },
    _selected: { state: true },
    _newTitle: { state: true },
    _editTitle: { state: true },
    _message: { state: true },
    _error: { state: true },
    _busy: { state: true },
  };

  static styles = css`
    :host { display: block; font-family: system-ui, sans-serif; color: #1f2937; }
    * { box-sizing: border-box; }
    .panel { border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px; background: #fff; }
    h2 { font-size: 1.1rem; margin: 0 0 12px; }
    h3 { font-size: 1rem; margin: 0 0 8px; }
    label { font-size: 0.9rem; color: #374151; }
    .row { display: flex; gap: 8px; margin: 6px 0 10px; flex-wrap: wrap; }
    input { flex: 1; min-width: 160px; padding: 6px 10px; border: 1px solid #d1d5db; border-radius: 6px; }
    button { cursor: pointer; border: 1px solid #d1d5db; background: #f9fafb; border-radius: 6px; padding: 6px 10px; }
    button[type="submit"] { background: #2563eb; color: #fff; border-color: #2563eb; }
    button.danger { color: #b91c1c; border-color: #fca5a5; }
    button:disabled { opacity: 0.6; cursor: wait; }
    .edit { margin-top: 12px; border-top: 1px solid #e5e7eb; padding-top: 12px; }
    .state { color: #6b7280; font-size: 0.9rem; }
    .ok { color: #047857; }
    .error { color: #b91c1c; }
    code { background: #f3f4f6; padding: 1px 6px; border-radius: 4px; }
  `;

  constructor() {
    super();
    this.apiUrl = "";
    this._selected = null;
    this._newTitle = "";
    this._editTitle = "";
    this._message = "";
    this._error = "";
    this._busy = false;
    this._onSelected = this._onSelected.bind(this);
  }

  // Escucha todo:selected mientras esté en la página
  connectedCallback() {
    super.connectedCallback();
    window.addEventListener("todo:selected", this._onSelected);
  }

  // Limpieza: quita el listener al salir de la página
  disconnectedCallback() {
    window.removeEventListener("todo:selected", this._onSelected);
    super.disconnectedCallback();
  }

  get _base() {
    return (this.apiUrl || "").replace(/\/$/, "");
  }

  async _request(method, path, body) {
    const res = await fetch(`${this._base}${path}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 204) return null;
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`Error ${res.status}: ${data.message || "la API rechazó la petición"}`);
    return data;
  }

  _emit(name, detail) {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  }

  // Ejecuta una acción mostrando estado ocupado, éxito o error
  async _run(action) {
    this._busy = true;
    this._message = "";
    this._error = "";
    try {
      await action();
    } catch (err) {
      this._error = err.message;
    } finally {
      this._busy = false;
    }
  }

  _onSelected(e) {
    const id = e.detail?.id;
    if (!id) return;
    this._selected = { id };
    this._editTitle = "";
    this._message = "";
    this._error = "";
  }

  // POST /todos
  async _create(e) {
    e.preventDefault();
    const title = this._newTitle.trim();
    if (!title) {
      this._error = "El título no puede estar vacío.";
      return;
    }
    await this._run(async () => {
      const todo = await this._request("POST", "", { title });
      this._newTitle = "";
      this._message = `Tarea creada: "${todo.title}"`;
      this._emit("todo:created", todo);
    });
  }

  // PUT /todos/{id} con el título
  async _saveTitle() {
    const title = this._editTitle.trim();
    if (!title) {
      this._error = "El nuevo título no puede estar vacío.";
      return;
    }
    await this._run(async () => {
      const todo = await this._request("PUT", `/${this._selected.id}`, { title });
      this._selected = todo;
      this._editTitle = "";
      this._message = "Título actualizado.";
      this._emit("todo:updated", todo);
    });
  }

  // PUT /todos/{id} con el estado
  async _setCompleted(completed) {
    await this._run(async () => {
      const todo = await this._request("PUT", `/${this._selected.id}`, { completed });
      this._selected = todo;
      this._message = completed ? "Tarea completada." : "Tarea marcada como pendiente.";
      this._emit("todo:updated", todo);
    });
  }

  // DELETE /todos/{id}
  async _delete() {
    if (!confirm("¿Seguro que quieres eliminar esta tarea?")) return;
    await this._run(async () => {
      const id = this._selected.id;
      await this._request("DELETE", `/${id}`);
      this._selected = null;
      this._message = "Tarea eliminada.";
      this._emit("todo:deleted", { id });
    });
  }

  render() {
    return html`
      <div class="panel">
        <h2>✎ Editor</h2>

        <form @submit=${this._create}>
          <label>Nueva tarea</label>
          <div class="row">
            <input
              .value=${this._newTitle}
              @input=${(e) => (this._newTitle = e.target.value)}
              placeholder="¿Qué hay que hacer?"
            />
            <button type="submit" ?disabled=${this._busy}>Agregar</button>
          </div>
        </form>

        ${this._selected
          ? html`
              <div class="edit">
                <h3>Editar tarea seleccionada</h3>
                <p class="state">
                  ${this._selected.title
                    ? html`<strong>${this._selected.title}</strong>`
                    : html`ID: <code>${this._selected.id}</code>`}
                </p>

                <label>Cambiar título</label>
                <div class="row">
                  <input
                    .value=${this._editTitle}
                    @input=${(e) => (this._editTitle = e.target.value)}
                    placeholder="Nuevo título"
                  />
                  <button @click=${this._saveTitle} ?disabled=${this._busy}>Guardar título</button>
                </div>

                <div class="row">
                  <button @click=${() => this._setCompleted(true)} ?disabled=${this._busy}>✅ Completar</button>
                  <button @click=${() => this._setCompleted(false)} ?disabled=${this._busy}>↩ Pendiente</button>
                  <button class="danger" @click=${this._delete} ?disabled=${this._busy}>🗑 Eliminar</button>
                  <button @click=${() => (this._selected = null)}>Cerrar</button>
                </div>
              </div>
            `
          : html`<p class="state">Selecciona una tarea en la lista para editarla.</p>`}

        ${this._message ? html`<p class="ok">${this._message}</p>` : ""}
        ${this._error ? html`<p class="error">${this._error}</p>` : ""}
      </div>
    `;
  }
}

if (!customElements.get("todo-editor")) {
  customElements.define("todo-editor", TodoEditor);
}