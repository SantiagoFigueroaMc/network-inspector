document.addEventListener("DOMContentLoaded", async () => {
  const targetFilterInput = document.getElementById("targetFilter");
  const currentTabOnlyCheckbox = document.getElementById("currentTabOnly");
  const clearBtn = document.getElementById("clearBtn");
  const requestListContainer = document.getElementById("requestList");
  const counterSpan = document.getElementById("counter");

  // Conjunto para persistir los IDs de tarjetas que el usuario ha expandido
  const expandedRequestIds = new Set();

  // Obtener la pestaña activa actual
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const activeTabId = activeTab ? activeTab.id : null;

  // Cargar filtro previo guardado
  const storedConfig = await chrome.storage.local.get(["filterQuery", "currentTabOnly"]);
  if (storedConfig.filterQuery) targetFilterInput.value = storedConfig.filterQuery;
  if (storedConfig.currentTabOnly !== undefined) currentTabOnlyCheckbox.checked = storedConfig.currentTabOnly;

  // Función principal para renderizar peticiones
  function renderRequests(requests) {
    const query = targetFilterInput.value.trim().toLowerCase();
    const filterByTab = currentTabOnlyCheckbox.checked;

    // Filtrar solicitudes según el input y pestaña
    const filtered = requests.filter(req => {
      const matchesTab = filterByTab ? (req.tabId === activeTabId) : true;
      const matchesUrl = query === "" || 
        req.url.toLowerCase().includes(query) || 
        req.hostname.toLowerCase().includes(query) ||
        req.pathname.toLowerCase().includes(query);

      return matchesTab && matchesUrl;
    });

    counterSpan.textContent = filtered.length;

    if (filtered.length === 0) {
      requestListContainer.innerHTML = `
        <div class="empty-state">
          No hay peticiones registradas que coincidan con el filtro actual.
        </div>
      `;
      return;
    }

    requestListContainer.innerHTML = "";

    filtered.forEach(req => {
      const card = document.createElement("div");
      card.className = "request-card";
      card.dataset.requestId = req.id;

      // Comprobar si esta petición ya estaba abierta por el usuario
      const isExpanded = expandedRequestIds.has(req.id);

      // Parámetros de consulta (Query params)
      const queryKeys = Object.keys(req.queryParams || {});
      let queryTableHtml = "";
      if (queryKeys.length > 0) {
        queryTableHtml = `
          <strong>Query Parameters:</strong>
          <table class="param-table">
            ${queryKeys.map(k => `
              <tr>
                <td class="param-key">${escapeHtml(k)}</td>
                <td class="param-val">${escapeHtml(req.queryParams[k])}</td>
              </tr>
            `).join("")}
          </table>
        `;
      }

      // Payload del cuerpo (si existe)
      let payloadHtml = "";
      if (req.rawBody) {
        payloadHtml = `
          <strong style="margin-top:6px; display:block;">Payload (Body):</strong>
          <div class="payload-block">${escapeHtml(req.rawBody)}</div>
        `;
      } else if (req.formData) {
        payloadHtml = `
          <strong style="margin-top:6px; display:block;">Form Data:</strong>
          <div class="payload-block">${escapeHtml(JSON.stringify(req.formData, null, 2))}</div>
        `;
      }

      card.innerHTML = `
        <div class="card-header">
          <span class="method ${req.method}">${req.method}</span>
          <span class="url-host" title="${escapeHtml(req.hostname)}">${escapeHtml(req.hostname)}</span>
          <span class="timestamp">${req.timestamp}</span>
        </div>
        <div class="card-path" title="${escapeHtml(req.url)}">${escapeHtml(req.pathname)}</div>
        <div class="card-details ${isExpanded ? "open" : ""}">
          <div style="margin-bottom: 6px;"><strong>URL Completa:</strong> <span style="word-break:break-all;">${escapeHtml(req.url)}</span></div>
          <div style="margin-bottom: 6px;"><strong>Origen (Initiator):</strong> ${escapeHtml(req.originUrl)}</div>
          ${queryTableHtml}
          ${payloadHtml}
        </div>
      `;

      // Evitar que hacer clic dentro de los detalles (seleccionar texto, copiar) colapse la tarjeta
      const detailsEl = card.querySelector(".card-details");
      detailsEl.addEventListener("click", (e) => {
        e.stopPropagation();
      });

      // Alternar visualización y persistir en el Set
      card.addEventListener("click", () => {
        if (expandedRequestIds.has(req.id)) {
          expandedRequestIds.delete(req.id);
          detailsEl.classList.remove("open");
        } else {
          expandedRequestIds.add(req.id);
          detailsEl.classList.add("open");
        }
      });

      requestListContainer.appendChild(card);
    });
  }

  async function refresh() {
    const data = await chrome.storage.local.get("capturedRequests");
    renderRequests(data.capturedRequests || []);
  }

  // Escuchar nuevas peticiones en tiempo real enviadas por el Service Worker
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "NEW_REQUEST") {
      refresh();
    }
  });

  // Guardar y aplicar filtros al escribir
  targetFilterInput.addEventListener("input", () => {
    chrome.storage.local.set({ filterQuery: targetFilterInput.value });
    refresh();
  });

  currentTabOnlyCheckbox.addEventListener("change", () => {
    chrome.storage.local.set({ currentTabOnly: currentTabOnlyCheckbox.checked });
    refresh();
  });

  // Botón Limpiar
  clearBtn.addEventListener("click", () => {
    expandedRequestIds.clear();
    chrome.runtime.sendMessage({ type: "CLEAR_REQUESTS" }, () => {
      refresh();
    });
  });

  // Carga inicial
  refresh();
});

// Función utilitaria para evitar XSS al renderizar texto
function escapeHtml(str) {
  if (typeof str !== "string") return str;
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
