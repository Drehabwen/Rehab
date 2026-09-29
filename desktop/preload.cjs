const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('rehabDesktop', {
  isDesktop: true,
  mode: 'local-first',
  publishGalenSnapshot: snapshot => ipcRenderer.invoke('galen-connector:publish', snapshot),
  getGalenConnectorStatus: () => ipcRenderer.invoke('galen-connector:status'),
  getGalenResearchFeedback: () => ipcRenderer.invoke('galen-connector:feedback'),
});
