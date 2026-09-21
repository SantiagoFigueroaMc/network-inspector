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
  function renderRequests(requests, replaceExisting = true) {
    const query = targetFilterInput.value.trim().toLowerCase();
    const filterByTab = currentTabOnlyCheckbox.checked;

    // Filtrar solicitudes según el input y pestaña
    let filtered = requests.filter(req => {
      const matchesTab = filterByTab ? (req.tabId === activeTabId) : true;
      const matchesUrl = query === "" || 
        req.url.toLowerCase().includes(query) || 
        req.hostname.toLowerCase().includes(query) ||
        req.pathname.toLowerCase().includes(query);

      return matchesTab && matchesUrl;
    });

    if (!replaceExisting) {
      const existingRequestIds = new Set(
        [...requestListContainer.querySelectorAll(".request-card")]
          .map(card => card.dataset.requestId)
      );
      filtered = filtered.filter(req => !existingRequestIds.has(String(req.id)));
    }

    counterSpan.textContent = replaceExisting
      ? filtered.length
      : requestListContainer.querySelectorAll(".request-card").length + filtered.length;

    if (filtered.length === 0) {
      if (replaceExisting) {
        requestListContainer.innerHTML = `
          <div class="empty-state">
            No hay peticiones registradas que coincidan con el filtro actual.
          </div>
        `;
      }
      return;
    }

    if (replaceExisting) requestListContainer.innerHTML = "";
    requestListContainer.querySelector(".empty-state")?.remove();

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
          <div class="param-list">
            ${queryKeys.map(k => `
              <details class="param-details">
                <summary>
                  <span class="param-key">${escapeHtml(k)}</span>
                  <span class="param-val">${escapeHtml(decodeQueryParam(req.queryParams[k]))}</span>
                </summary>
                <pre class="param-json">${escapeHtml(JSON.stringify(translateQueryParam(k, req.queryParams[k]), null, 2))}</pre>
              </details>
            `).join("")}
          </div>
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
        <div class="request-summary">
          <div class="card-header">
            <span class="method ${req.method}">${req.method}</span>
            <span class="url-host" title="${escapeHtml(req.hostname)}">${escapeHtml(req.hostname)}</span>
            <span class="timestamp">${req.timestamp}</span>
          </div>
          <div class="card-path" title="${escapeHtml(req.url)}">${escapeHtml(req.pathname)}</div>
        </div>
        <div class="card-details ${isExpanded ? "open" : ""}">
          <details class="full-url-details">
            <summary>URL Completa</summary>
            <div class="full-url-value">${escapeHtml(req.url)}</div>
          </details>
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

  async function refresh(replaceExisting = true) {
    const data = await chrome.storage.local.get("capturedRequests");
    renderRequests(data.capturedRequests || [], replaceExisting);
  }

  const refreshInterval = setInterval(() => refresh(false), 1000);
  window.addEventListener("unload", () => clearInterval(refreshInterval));

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

function translateQueryParam(key, value) {
  if (key !== "p2" || typeof value !== "string") return value;

  const result = {};
  const normalizedValue = value.includes("=") ? value : decodeURIComponent(value);
  normalizedValue.split("&").forEach(part => {
    const separatorIndex = part.indexOf("=");
    const field = separatorIndex === -1 ? part : part.slice(0, separatorIndex);
    const fieldValue = separatorIndex === -1 ? "" : part.slice(separatorIndex + 1);

    if (field === "p") {
      result[field] = parseProductList(decodeRepeatedly(fieldValue));
    } else if (field) {
      result[field] = parseJsonValue(decodeRepeatedly(fieldValue));
    }
  });

  return result;
}

function decodeQueryParam(value) {
  if (typeof value !== "string") return value;

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function parseProductList(value) {
  const list = value.replace(/^\[|\]$/g, "");
  if (!list) return [];

  return list.split(",").map(product => {
    const result = {};
    product.split("&").forEach(part => {
      const separatorIndex = part.indexOf("=");
      const field = separatorIndex === -1 ? part : part.slice(0, separatorIndex);
      const fieldValue = separatorIndex === -1 ? "" : part.slice(separatorIndex + 1);
      if (field) {
        const normalizedField = field === "pr" ? "p" : field;
        const decodedFieldValue = decodeRepeatedly(fieldValue);
        result[normalizedField] = normalizedField === "i"
          ? decodedFieldValue
          : parseJsonValue(decodedFieldValue);
      }
    });
    return result;
  });
}

function parseJsonValue(value) {
  if (value !== "" && !Number.isNaN(Number(value))) return Number(value);
  return value;
}

function decodeRepeatedly(value) {
  let decoded = value;
  for (let i = 0; i < 5; i += 1) {
    let next;
    try {
      next = decodeURIComponent(decoded);
    } catch {
      break;
    }
    if (next === decoded) break;
    decoded = next;
  }
  return decoded;
}

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
