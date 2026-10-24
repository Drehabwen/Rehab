/// <reference types="vite/client" />

interface ResearchBatchSummary {
  batchId: string;
  exportedAt: number;
  counts: Record<string, number>;
  path: string;
}

interface RehabDesktopBridge {
  isDesktop: true;
  mode: 'local-first';
  publishGalenSnapshot: (snapshot: import('./lib/galenConnector').GalenConnectorSnapshot) => Promise<{
    path: string;
    bytes: number;
  }>;
  getGalenConnectorStatus: () => Promise<import('./lib/galenConnector').GalenConnectorStatus>;
  getGalenResearchFeedback: () => Promise<import('./lib/galenConnector').GalenResearchFeedback>;
  /** 研究数据批次落盘（%LOCALAPPDATA%\Rehab\GalenConnector\exports\<batchId>）。 */
  exportGalenResearch?: (pkg: {
    schema: 'rehab-research/1';
    batchId: string;
    exportedAt: number;
    since: number | null;
    coverage: { from: number | null; to: number | null };
    counts: Record<string, number>;
    quality: unknown;
    files: Array<{ name: string; content: string }>;
  }) => Promise<{
    path: string;
    batchId: string;
    bytes: number;
    files: Array<{ name: string; bytes: number; sha256: string; lines: number }>;
  }>;
  listGalenResearchBatches?: () => Promise<ResearchBatchSummary[]>;
}

interface Window {
  rehabDesktop?: RehabDesktopBridge;
}
