// Memoria volátil para almacenar las últimas peticiones (máx 150)
const MAX_REQUESTS = 1000;
let capturedRequests = [];
let storageWriteQueue = Promise.resolve();

// Recuperar las peticiones existentes cuando el service worker se reactiva.
const storageReady = chrome.storage.local.get("capturedRequests").then(data => {
  if (capturedRequests.length === 0) {
    capturedRequests = data.capturedRequests || [];
  }
});

// Escucha todas las peticiones antes de ser enviadas
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    // Excluir peticiones internas del navegador o de la propia extensión
    if (details.url.startsWith("chrome-extension://") || details.tabId === -1) {
      return;
    }

    const parsedUrl = new URL(details.url);

    // Estructura de la petición interceptada
    const requestItem = {
      id: `${details.requestId}-${details.timeStamp}`,
      tabId: details.tabId,
      method: details.method,
      url: details.url,
      originUrl: details.initiator || "Direct / Desconocido",
      pathname: parsedUrl.pathname,
      hostname: parsedUrl.hostname,
      queryParams: Object.fromEntries(parsedUrl.searchParams.entries()),
      timestamp: new Date().toLocaleTimeString(),
      timeStampRaw: details.timeStamp
    };

    // Si tiene payload POST (form-data o raw)
    if (details.requestBody) {
      if (details.requestBody.formData) {
        requestItem.formData = details.requestBody.formData;
      } else if (details.requestBody.raw) {
        try {
          const decoder = new TextDecoder("utf-8");
          const rawStrings = details.requestBody.raw.map(buffer => decoder.decode(buffer.bytes));
          requestItem.rawBody = rawStrings.join("");
        } catch (e) {
          requestItem.rawBody = "[Binario / No decodificable]";
        }
      }
    }

    // Guardar en la cola
    capturedRequests.unshift(requestItem);
    if (capturedRequests.length > MAX_REQUESTS) {
      capturedRequests.pop();
    }

    // Serializar las escrituras para evitar que una operación vieja sobrescriba otra nueva.
    const requestsToStore = [...capturedRequests];
    storageWriteQueue = storageWriteQueue.then(() =>
      chrome.storage.local.set({ capturedRequests: requestsToStore })
    );

    // Enviar mensaje en vivo por si el popup está activo
    chrome.runtime.sendMessage({
      type: "NEW_REQUEST",
      payload: requestItem
    }).catch(() => {
      // Ignorar error si el popup no está abierto en ese instante
    });
  },
  { urls: ["<all_urls>"] },
  ["requestBody"]
);

// Manejo de comandos para limpiar registros
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "CLEAR_REQUESTS") {
    capturedRequests = [];
    chrome.storage.local.set({ capturedRequests: [] });
    sendResponse({ status: "ok" });
  }
});

// Limpiar las peticiones de una pestaña cuando esta recarga o navega a otra página
chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  if (details.frameId !== 0) return; // Solo navegación del frame principal, no iframes

  capturedRequests = capturedRequests.filter(req => req.tabId !== details.tabId);

  const requestsToStore = [...capturedRequests];
  storageWriteQueue = storageWriteQueue.then(() =>
    chrome.storage.local.set({ capturedRequests: requestsToStore })
  );

  chrome.runtime.sendMessage({
    type: "TAB_REQUESTS_CLEARED",
    tabId: details.tabId
  }).catch(() => {
    // Ignorar error si el popup no está abierto en ese instante
  });
});
