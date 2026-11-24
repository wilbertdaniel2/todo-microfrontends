# MFE Editor · `<todo-editor>` · Lit

Microfrontend de **escritura** (comandos) de la app TODO.

- **Tecnología**: Lit 3 + Vite (modo librería)
- **Bucket**: `mfe-editor-avila9996`
- **Módulo publicado**: http://mfe-editor-avila9996.s3-website-us-east-1.amazonaws.com/todo-editor.js

## Qué hace

| Acción | Operación de la API | Evento que emite |
|---|---|---|
| Formulario **Nueva tarea** | `POST /todos` | `todo:created` (TODO creado) |
| **Guardar título** en el panel de edición | `PUT /todos/{id}` con `{ title }` | `todo:updated` (TODO actualizado) |
| **✅ Completar** / **↩ Pendiente** | `PUT /todos/{id}` con `{ completed }` | `todo:updated` |
| **🗑 Eliminar** (con confirmación) | `DELETE /todos/{id}` | `todo:deleted` (`{ id }`) |

**Escucha** `todo:selected`: al recibirlo, abre el panel **Editar tarea seleccionada** con ese `id`.

- Valida que el título no esté vacío, al crear y al editar.
- Muestra los errores 400 y 404 con el mensaje que devuelve la API.
- Respeta el reparto: **solo usa POST, PUT y DELETE**. Como `todo:selected` solo trae el `id`, el panel no hace un GET para buscar el título (esa operación es del Viewer); ofrece acciones que no necesitan el estado previo, y tras el primer PUT muestra el título que devuelve la API.

## Integración de Lit con el contrato

Lit está diseñado para crear Web Components, así que **no necesita envoltorio**: la clase `TodoEditor extends LitElement` **es** el Custom Element.

| Requisito del contrato | Cómo se cumple |
|---|---|
| Etiqueta `<todo-editor>` | `customElements.define("todo-editor", TodoEditor)`, protegido con `if (!customElements.get(...))` para evitar el error si el módulo se importa dos veces |
| Atributo `api-url` | Propiedad reactiva `apiUrl: { type: String, attribute: "api-url" }`; se quita una barra final por si acaso |
| Aislamiento | Lit crea el Shadow DOM automáticamente y encapsula `static styles` |
| Limpieza | El listener de `todo:selected` se agrega en `connectedCallback` y se quita en `disconnectedCallback` |
| Seguridad (XSS) | Las expresiones `${...}` de las plantillas `html` se pintan como texto, nunca como HTML |
| Un módulo ES | `vite.config.js` compila en modo librería (`formats: ["es"]`) a un único `todo-editor.js` con Lit incluido |

Detalle: los valores iniciales de las propiedades reactivas se asignan en el `constructor` y no como campos de clase, porque en JavaScript puro los campos de clase ocultan los accesores reactivos de Lit y el componente dejaría de actualizarse.

## Desarrollo y prueba aislada

```bash
npm install
npm run dev
```

`index.html` monta `<todo-editor>` solo, con la URL real de la API, y registra en la consola los eventos que emite. Para simular el Viewer:

```javascript
window.dispatchEvent(new CustomEvent("todo:selected", { detail: { id: "<id>" } }))
```

## Compilar y desplegar

```bash
npm run build                 # genera dist/todo-editor.js
cd ..
aws s3 sync mfe-editor/dist s3://mfe-editor-avila9996 --delete --content-type "text/javascript"
```

El bucket tiene lectura pública y CORS que permite el origen del Shell (`infra/cors.json`), necesario porque el Shell importa este módulo desde otro origen.
