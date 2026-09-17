chrome.action.onClicked.addListener((tab) => {
  // Abre el panel lateral al hacer clic en el ícono de la extensión
  chrome.sidePanel.setOptions({
    tabId: tab.id,
    path: 'popup.html',
    enabled: true
  });
  chrome.sidePanel.open({ tabId: tab.id });
});
