import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import styles from "./styles.css?inline";

class TodoViewer extends HTMLElement {
  static get observedAttributes() {
    return ["api-url"];
  }

  connectedCallback() {
    if (!this.shadowRoot) {
      const shadow = this.attachShadow({ mode: "open" });
      const style = document.createElement("style");
      style.textContent = styles;
      this.mountPoint = document.createElement("div");
      shadow.append(style, this.mountPoint);
    }
    this.root = createRoot(this.mountPoint);
    this.render();
  }

  attributeChangedCallback() {
    if (this.root) this.render();
  }

  disconnectedCallback() {
    this.root?.unmount();
    this.root = null;
  }

  render() {
    const apiUrl = (this.getAttribute("api-url") || "").replace(/\/$/, "");
    this.root.render(<App apiUrl={apiUrl} />);
  }
}

if (!customElements.get("todo-viewer")) {
  customElements.define("todo-viewer", TodoViewer);
}