# Network Request Inspector (Criteo Inspector)

Extensión de Chrome que monitorea y visualiza las peticiones de red enviadas hacia endpoints o dominios específicos, con traducción de eventos de Criteo.

## Instalación (sin empaquetar)

1. Abre Chrome (o cualquier navegador basado en Chromium) y ve a `chrome://extensions`.
2. Activa el **Modo de desarrollador** (interruptor en la esquina superior derecha).
3. Haz clic en **Cargar descomprimida** (Load unpacked).
4. Selecciona la carpeta raíz de este proyecto (`criteo-inspector`), la que contiene `manifest.json`.
5. La extensión "Network Request Inspector" aparecerá en la lista y en la barra de herramientas.

Cada vez que modifiques el código, vuelve a `chrome://extensions` y haz clic en el botón de recarga (🔄) de la extensión para aplicar los cambios.

## Uso

1. Haz clic en el ícono de la extensión en la barra de herramientas para abrir el popup.
2. Todas las peticiones de red capturadas se listan en tiempo real, más recientes primero.
3. **Filtrar por URL/endpoint**: escribe en el campo de texto para filtrar por hostname, path o URL completa (ej: `criteo`, `/collect`, `api/v1`).
4. **Pestaña activa**: si el checkbox "Pestaña activa" está marcado, solo se muestran peticiones de la pestaña actualmente activa.
5. Haz clic en una tarjeta de petición para expandir sus detalles: URL completa, origen (initiator), query params traducidos y payload (body/form-data).
6. Al recargar la página o navegar a otra URL en una pestaña, las peticiones capturadas de esa pestaña se limpian automáticamente.
7. El botón **Limpiar** borra todo el historial de peticiones capturadas.

### Configurar traducciones de eventos

1. Haz clic en el ícono ⚙️ del header para abrir el panel de traducciones.
2. Agrega una regla indicando:
   - **Dominio**: `criteo` (aplica solo a hosts que contengan "criteo"), `*` (aplica a cualquier dominio) o un patrón personalizado (ej: `google-analytics`).
   - **Código de evento**: el valor crudo del evento (ej: `vpg`).
   - **Traducción**: el texto legible a mostrar (ej: `View page`).
3. Las reglas específicas de dominio tienen prioridad sobre las reglas con `*`.
4. Usa el botón ✕ junto a cada regla para eliminarla.

Las traducciones por defecto (`vl`, `ac`, `vh`, `vpg`, etc.) están definidas en [event-translations.js](event-translations.js).

## Permisos requeridos

- `webRequest` y `host_permissions: <all_urls>`: para interceptar y leer las peticiones de red de cualquier sitio.
- `webNavigation`: para detectar recargas/cambios de página y limpiar el historial de la pestaña correspondiente.
- `storage`: para persistir peticiones capturadas, filtros y traducciones de eventos.
- `activeTab`: para identificar la pestaña activa y aplicar el filtro correspondiente.
