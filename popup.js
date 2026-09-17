import { icons } from "./assets.js";

let dataLayer = [];
let digitalData = null; // Guarda el estado actual de digitalData
let filterValue = "";
let digitalDataFilterValue = ""; // Filtro para digitalData
let refreshInterval = null;
let lastRenderedData = "";
let lastRenderedDigitalData = ""; // Control de renderizado para digitalData
let tagManagers = [];

const filteredDataLayer = () => dataLayer.filter(e => {
  if (!filterValue) return true;
  if (!e || typeof e.event !== 'string') return false;
  return strCompare(e.event, filterValue) || Object.keys(e).filter(k => strCompare(k, filterValue)).length;
});

// Filtra las llaves de primer nivel y su contenido en digitalData
const filteredDigitalData = () => {
  if (!digitalData) return null;
  if (!digitalDataFilterValue) return digitalData;
  
  const result = {};
  for (const [key, value] of Object.entries(digitalData)) {
    if (strCompare(key, digitalDataFilterValue) || strCompare(JSON.stringify(value), digitalDataFilterValue)) {
      result[key] = value;
    }
  }
  return result;
};

function strCompare(s1, s2) {
  if (!s1 || !s2) return false;
  return s1.toLowerCase().includes(s2.toLowerCase());
}

function renderTagManagers() {
  const list = document.getElementById("tag-managers-list");
  if (!list) return;

  list.replaceChildren();
  if (!tagManagers.length) {
    const emptyMessage = document.createElement("small");
    emptyMessage.textContent = "No tag managers found...";
    list.appendChild(emptyMessage);
    return;
  }

  for (const manager of tagManagers) {
    const item = document.createElement("div");
    item.className = "tag-manager-item";

    const icon = document.createElement("span");
    icon.className = "tag-manager-icon";
    icon.setAttribute("aria-hidden", "true");

    const iconImage = document.createElement("img");
    iconImage.src = icons[manager.icon] || icons.container_tag;
    iconImage.alt = "";
    iconImage.addEventListener("error", () => {
      iconImage.replaceWith(document.createTextNode(manager.name.charAt(0)));
    }, { once: true });
    icon.appendChild(iconImage);

    const details = document.createElement("span");
    details.className = "tag-manager-details";

    const name = document.createElement("strong");
    name.textContent = manager.name;
    details.appendChild(name);

    const ids = document.createElement("small");
    ids.textContent = manager.ids.length
      ? `ID: ${manager.ids.join(", ")}`
      : "Detected on this page";
    details.appendChild(ids);

    item.append(icon, details);
    list.appendChild(item);
  }
}

function loadTagManagers(tabId) {
  chrome.scripting.executeScript({
    target: { tabId },
    world: "MAIN",
    func: () => {
      const scripts = Array.from(document.scripts, script => script.src).filter(Boolean);
      const unique = values => [...new Set(values.filter(Boolean))];
      const managers = [];
      const addManager = (name, icon, ids = []) => {
        const existing = managers.find(manager => manager.name === name);
        if (existing) {
          existing.ids = unique([...existing.ids, ...ids]);
        } else {
          managers.push({ name, icon, ids: unique(ids) });
        }
      };

      const gtmIds = unique([
        ...Object.keys(window.google_tag_manager || {}).filter(id => /^GTM-/i.test(id)),
        ...scripts.flatMap(src => {
          const match = src.match(/[?&]id=(GTM-[^&]+)/i);
          return match ? [match[1]] : [];
        })
      ]);
      if (gtmIds.length || scripts.some(src => /googletagmanager\.com\/gtm\.js/i.test(src))) {
        addManager("Google Tag Manager", "google_tag_manager", gtmIds);
      }

      const launchIds = scripts.flatMap(src => {
        const match = src.match(/assets\.adobedtm\.com\/(launch-[^/?]+?)(?:\.min)?\.js(?:[?#]|$)/i);
        return match ? [match[1]] : [];
      });
      if (window._satellite || launchIds.length || scripts.some(src => /assets\.adobedtm\.com/i.test(src))) {
        addManager("Adobe Experience Platform Launch", "adobe_experience_platform_launch", launchIds);
      }

      const tealiumIds = scripts.flatMap(src => {
        const match = src.match(/tags\.tiqcdn\.com\/utag\/([^/]+)\/([^/]+)\/([^/]+)/i);
        return match ? [`${match[1]}/${match[2]}/${match[3]}`] : [];
      });
      if (window.utag || tealiumIds.length || scripts.some(src => /tiqcdn\.com\/utag/i.test(src))) {
        addManager("Tealium iQ", "tealium_iq", tealiumIds);
      }

      if (window._mtm || window.matomoTagManager || scripts.some(src => /matomo.*tag-manager|matomoTagManager/i.test(src))) {
        addManager("Matomo Tag Manager", "matomo_tag_manager");
      }

      if (window.analytics || scripts.some(src => /cdn\.segment\.com\/analytics/i.test(src))) {
        addManager("Segment", "segment");
      }

      return managers;
    }
  }, results => {
    if (chrome.runtime.lastError) {
      setAlert(`Error detecting tag managers: ${chrome.runtime.lastError.message}`, "tag_manager_error");
      return;
    }
    tagManagers = results?.[0]?.result || [];
    renderTagManagers();
  });
}

// Maneja las alertas de forma acumulativa pero única por tipo
async function setAlert(msg, type = "generic") {
  const alertTag = document.querySelector("#alerts");
  if (!alertTag) return;

  const existingAlert = alertTag.querySelector(`[data-type="${type}"]`);
  if (existingAlert) {
    existingAlert.remove();
  }

  const alertDiv = document.createElement("div");
  alertDiv.className = "alert-item";
  alertDiv.setAttribute("data-type", type);
  alertDiv.style.display = "flex";
  alertDiv.style.justifyContent = "between";
  alertDiv.style.marginBottom = "5px";

  const time = new Date().toLocaleTimeString();
  const textSpan = document.createElement("span");
  textSpan.textContent = `[${time}] ${msg}`;

  const closeBtn = document.createElement("button");
  closeBtn.textContent = "✕";
  closeBtn.style.marginLeft = "10px";
  closeBtn.addEventListener("click", () => {
    alertDiv.remove();
  });

  alertDiv.appendChild(textSpan);
  alertDiv.appendChild(closeBtn);

  alertTag.insertBefore(alertDiv, alertTag.firstChild);
}

function printDatalayer() {
  const output = document.getElementById('output');
  if (!output) return;

  const currentDataString = JSON.stringify(filteredDataLayer(), null, 2);
  if (currentDataString !== lastRenderedData) {
    output.textContent = currentDataString;
    lastRenderedData = currentDataString;
  }
}

// Renderiza el contenido de digitalData si ha cambiado
function printDigitalData() {
  const output = document.getElementById('digitalData-output');
  if (!output) return;

  if (digitalData === "not found") {
    if (output.textContent !== "No se encontró un digitalData en esta página.") {
      output.textContent = "No se encontró un digitalData en esta página.";
    }
    return;
  }

  const currentDataString = JSON.stringify(filteredDigitalData(), null, 2);
  if (currentDataString !== lastRenderedDigitalData) {
    output.textContent = currentDataString;
    lastRenderedDigitalData = currentDataString;
  }
}

function loadDataLayer() {
  if (typeof chrome === 'undefined' || !chrome.tabs) {
    setAlert("La API de Chrome no está disponible.", "api_unavailable");
    return;
  }

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (chrome.runtime.lastError) {
      setAlert(`Error al consultar pestañas: ${chrome.runtime.lastError.message}`, "tabs_query_error");
      return;
    }

    if (!tabs || !tabs[0]) {
      const output = document.getElementById('output');
      const ddOutput = document.getElementById('digitalData-output');
      if (output && output.textContent !== "No se pudo acceder a la pestaña activa.") {
        output.textContent = "No se pudo acceder a la pestaña activa.";
      }
      if (ddOutput && ddOutput.textContent !== "No se pudo acceder a la pestaña activa.") {
        ddOutput.textContent = "No se pudo acceder a la pestaña activa.";
      }
      setAlert("No se detectó ninguna pestaña activa.", "no_active_tab");
      return;
    }

    // Extrae ambas variables globales en una sola llamada estructurada
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      world: "MAIN",
      func: () => {
        return {
          dataLayer: Array.isArray(window.dataLayer) ? window.dataLayer : "not found",
          digitalData: typeof window.digitalData === 'object' ? window.digitalData : "not found"
        };
      }
    }, (results) => {
      if (chrome.runtime.lastError) {
        const errorMsg = chrome.runtime.lastError.message;
        setAlert(`Error de script en pestaña ${tabs[0].id}: ${errorMsg}`, `script_error_${tabs[0].id}`);
        const output = document.getElementById('output');
        const ddOutput = document.getElementById('digitalData-output');
        if (output) output.textContent = `Error: ${errorMsg}`;
        if (ddOutput) ddOutput.textContent = `Error: ${errorMsg}`;
        return;
      }

      if (results && results[0] && results[0].result) {
        const { dataLayer: dlRes, digitalData: ddRes } = results[0].result;
        const alertTag = document.querySelector("#alerts");

        // Procesar dataLayer
        const output = document.getElementById('output');
        if (dlRes === "not found") {
          if (output && output.textContent !== "No se encontró un dataLayer en esta página.") {
            output.textContent = "No se encontró un dataLayer en esta página.";
          }
          setAlert("dataLayer ausente en el objeto window de esta página.", "datalayer_missing");
        } else {
          dataLayer = dlRes;
          printDatalayer();
          const missingDLAlert = alertTag?.querySelector('[data-type="datalayer_missing"]');
          if (missingDLAlert) missingDLAlert.remove();
        }

        // Procesar digitalData
        digitalData = ddRes;
        if (digitalData === "not found") {
          setAlert("digitalData ausente en el objeto window de esta página.", "digitaldata_missing");
        } else {
          const missingDDAlert = alertTag?.querySelector('[data-type="digitaldata_missing"]');
          if (missingDDAlert) missingDDAlert.remove();
        }
        printDigitalData();
      }
      loadTagManagers(tabs[0].id);
    });
  });
}

async function filterEventsChange(e) {
  filterValue = e.target.value;
  printDatalayer();
  try {
    await chrome.storage.local.set({ filterValue });
  } catch (err) {
    setAlert(`Error guardando filtro: ${err.message}`, "storage_save_error");
  }
}

// Handler dedicado para el filtro de digitalData
async function filterDigitalDataChange(e) {
  digitalDataFilterValue = e.target.value;
  printDigitalData();
  try {
    await chrome.storage.local.set({ digitalDataFilterValue });
  } catch (err) {
    setAlert(`Error guardando filtro de digitalData: ${err.message}`, "storage_save_error_dd");
  }
}

async function init() {
  let storage = { filterValue: "", digitalDataFilterValue: "" };
  try {
    storage = await chrome.storage.local.get(["filterValue", "digitalDataFilterValue"]);
  } catch (err) {
    setAlert(`Error cargando almacenamiento: ${err.message}`, "storage_load_error");
  }

  filterValue = storage.filterValue || "";
  digitalDataFilterValue = storage.digitalDataFilterValue || "";

  // Input filtro dataLayer
  const filterInput = document.getElementById('event-filter');
  if (filterInput) {
    filterInput.value = filterValue;
    filterInput.removeEventListener('input', filterEventsChange);
    filterInput.addEventListener('input', filterEventsChange);
  }

  // Input filtro digitalData
  const ddFilterInput = document.getElementById('digitalData-filter');
  if (ddFilterInput) {
    ddFilterInput.value = digitalDataFilterValue;
    ddFilterInput.removeEventListener('input', filterDigitalDataChange);
    ddFilterInput.addEventListener('input', filterDigitalDataChange);
  }

  loadDataLayer();
  if (refreshInterval) clearInterval(refreshInterval);
  refreshInterval = setInterval(loadDataLayer, 1000);
}

document.addEventListener('DOMContentLoaded', init);

document.getElementById('refresh-tag-managers')?.addEventListener('click', () => {
  loadDataLayer();
});

if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.onActivated) {
  chrome.tabs.onActivated.addListener(() => {
    lastRenderedData = "";
    lastRenderedDigitalData = "";
    loadDataLayer();
  });
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.active) {
      lastRenderedData = "";
      lastRenderedDigitalData = "";
      loadDataLayer();
    }
  });
}

const hardReloadButton = document.getElementById('btn-hard-reload');
let holdTimer;
let holdCompleted = false;

const resetHardReloadHold = () => {
  clearTimeout(holdTimer);
  hardReloadButton.classList.remove('is-holding');
};

hardReloadButton.addEventListener('pointerdown', (event) => {
  if (event.pointerType === 'mouse' && event.button !== 0) return;

  clearTimeout(holdTimer);
  holdCompleted = false;
  hardReloadButton.classList.add('is-holding');
  holdTimer = setTimeout(() => {
    holdCompleted = true;
  }, 1000);
});

hardReloadButton.addEventListener('pointerup', () => {
  resetHardReloadHold();
});

hardReloadButton.addEventListener('pointerleave', () => {
  holdCompleted = false;
  resetHardReloadHold();
});

hardReloadButton.addEventListener('pointercancel', () => {
  holdCompleted = false;
  resetHardReloadHold();
});

hardReloadButton.addEventListener('click', async (event) => {
  if (!holdCompleted) {
    event.preventDefault();
    return;
  }

  holdCompleted = false;
  resetHardReloadHold();
  hardReloadButton.disabled = true;
  setTimeout(() => {
    hardReloadButton.disabled = false;
  }, 300);

  try {
    // 1. Obtener la pestaña activa
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab?.id) {
      console.warn('No se encontró ninguna pestaña activa.');
      return;
    }

    // Evitar ejecutar scripts en páginas especiales de Chrome (chrome://, etc.)
    if (tab.url && (tab.url.startsWith('chrome://') || tab.url.startsWith('edge://'))) {
      console.warn('No se puede inyectar scripts en páginas internas del navegador.');
      await chrome.tabs.reload(tab.id, { bypassCache: true });
      return;
    }

    // 2. Inyectar un script para limpiar almacenamiento local y cookies del sitio
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        try {
          // Limpiar Storage síncrono
          localStorage.clear();
          sessionStorage.clear();

          // Limpiar todas las cookies del documento
          const cookies = document.cookie.split(";");
          for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i];
            const eqPos = cookie.indexOf("=");
            const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
            // Sobrescribir expiración para eliminarlas
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
          }

          // Desregistrar Service Workers activos para este origen
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then((registrations) => {
              for (const registration of registrations) {
                registration.unregister();
              }
            });
          }
          
          console.log('Almacenamiento local, cookies y Service Workers limpiados con éxito.');
        } catch (err) {
          console.error('Error al limpiar datos en la página:', err);
        }
      }
    });

    // 3. Forzar el Hard Reload omitiendo la caché del navegador
    await chrome.tabs.reload(tab.id, { bypassCache: true });
    console.log(`Pestaña ${tab.id} limpiada y recargada con éxito.`);

  } catch (error) {
    console.error('Error durante el proceso de limpieza y recarga:', error);
  }
});
