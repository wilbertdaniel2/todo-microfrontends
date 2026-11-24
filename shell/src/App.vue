<script setup>
import { onMounted, ref } from "vue";

const SHELL_VERSION = "1.0.0";

// Las dos zonas (slots) del layout
const zones = ref({
  "slot-editor": { label: "Editor", status: "loading", error: "" },
  "slot-viewer": { label: "Viewer", status: "loading", error: "" },
});
const versions = ref([]);
const configError = ref("");

// Lee un JSON publicado junto al shell, sin caché
async function loadJson(file) {
  const res = await fetch(`./${file}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`No se pudo leer ${file} (HTTP ${res.status})`);
  return res.json();
}

// Carga un microfrontend y lo monta en su zona
async function mountMfe(mfe, apiUrl) {
  const zone = zones.value[mfe.slot];
  try {
    await import(/* @vite-ignore */ mfe.url);
    if (!customElements.get(mfe.tag)) {
      throw new Error(`el módulo no registró <${mfe.tag}>`);
    }
    const el = document.createElement(mfe.tag);
    el.setAttribute("api-url", apiUrl);
    document.getElementById(mfe.slot).appendChild(el);
    zone.status = "ok";
  } catch (err) {
    zone.status = "error";
    zone.error = err.message;
  }
}

onMounted(async () => {
  try {
    const [config, registry] = await Promise.all([
      loadJson("config.json"),
      loadJson("registry.json"),
    ]);
    versions.value = registry.mfes.map((m) => `${m.name} v${m.version ?? "?"}`);
    // Cada MFE se carga por separado: si uno falla, el otro sigue
    await Promise.all(registry.mfes.map((m) => mountMfe(m, config.apiUrl)));
  } catch (err) {
    configError.value = err.message;
    Object.values(zones.value).forEach((z) => {
      z.status = "error";
      z.error = "sin configuración";
    });
  }
});
</script>

<template>
  <header class="header">
    <h1>📝 TODO App</h1>
    <p>Shell + microfrontends · Sistemas Distribuidos</p>
  </header>

  <p v-if="configError" class="banner">⚠️ {{ configError }}</p>

  <main class="layout">
    <section v-for="(zone, slot) in zones" :key="slot" class="zone">
      <p v-if="zone.status === 'loading'" class="muted">Cargando {{ zone.label }}…</p>
      <p v-if="zone.status === 'error'" class="warn">
        ⚠️ El microfrontend <strong>{{ zone.label }}</strong> no está disponible
        ({{ zone.error }}). El resto de la aplicación sigue funcionando.
      </p>
      <div :id="slot"></div>
    </section>
  </main>

  <footer class="footer">
    Shell v{{ SHELL_VERSION }}
    <span v-for="v in versions" :key="v"> · {{ v }}</span>
  </footer>
</template>

<style>
body { margin: 0; font-family: system-ui, sans-serif; background: #f3f4f6; color: #111827; }
.header { background: #1e3a8a; color: #fff; padding: 16px 24px; }
.header h1 { margin: 0; font-size: 1.5rem; }
.header p { margin: 4px 0 0; opacity: 0.85; }
.banner { background: #fee2e2; color: #991b1b; margin: 16px 24px 0; padding: 10px 14px; border-radius: 8px; }
.layout { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; padding: 24px; }
@media (max-width: 800px) { .layout { grid-template-columns: 1fr; } }
.zone { min-height: 120px; }
.muted { color: #6b7280; }
.warn { background: #fef3c7; color: #92400e; padding: 12px; border-radius: 8px; }
.footer { text-align: center; color: #6b7280; font-size: 0.85rem; padding: 16px; }
</style>