/// <reference types="vite/client" />

interface RehabDesktopBridge {
  isDesktop: true;
  mode: 'local-first';
  publishGalenSnapshot: (snapshot: import('./lib/galenConnector').GalenConnectorSnapshot) => Promise<{
    path: string;
    bytes: number;
  }>;
  getGalenConnectorStatus: () => Promise<import('./lib/galenConnector').GalenConnectorStatus>;
  getGalenResearchFeedback: () => Promise<import('./lib/galenConnector').GalenResearchFeedback>;
}

interface Window {
  rehabDesktop?: RehabDesktopBridge;
}
