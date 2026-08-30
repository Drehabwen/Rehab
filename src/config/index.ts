const browserOrigin = typeof window !== 'undefined' ? window.location.origin : '';
const browserWsOrigin = browserOrigin.replace(/^http/, 'ws');
const DEFAULT_API_BASE_URL = import.meta.env.DEV ? 'http://localhost:8000' : browserOrigin;
const DEFAULT_WS_URL = import.meta.env.DEV
  ? 'ws://localhost:8000/ws/analyze'
  : `${browserWsOrigin}/ws/analyze`;

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

const toWebSocketBaseUrl = (value: string) => {
  const normalized = trimTrailingSlash(value);
  if (normalized.startsWith('https://')) return `wss://${normalized.slice('https://'.length)}`;
  if (normalized.startsWith('http://')) return `ws://${normalized.slice('http://'.length)}`;
  return normalized;
};

const apiBaseUrl = trimTrailingSlash(import.meta.env.VITE_API_BASE_URL ?? DEFAULT_API_BASE_URL);
const websocketUrl = import.meta.env.VITE_WS_URL ?? DEFAULT_WS_URL;
const medvoiceBaseUrl = trimTrailingSlash(import.meta.env.VITE_MEDVOICE_BASE_URL ?? `${apiBaseUrl}/medvoice`);
const medvoiceWsBaseUrl = toWebSocketBaseUrl(medvoiceBaseUrl);

export const CONFIG = {
  websocket: {
    url: websocketUrl,
  },
  video: {
    defaultWidth: 640,
    defaultHeight: 480,
  },
  analysis: {
    timeout: 120000,
    confidenceThreshold: 0.5,
  },
  postureThresholds: {
    headForward: {
      moderate: 0.25,
      severe: 0.45,
    },
    shoulderRounded: {
      mild: 0.15,
    },
    headTilt: {
      mild: 0.03,
      moderate: 0.08,
    },
    unevenShoulders: {
      mild: 0.03,
      moderate: 0.08,
    },
    unevenHips: {
      mild: 0.03,
      moderate: 0.08,
    },
    midlineShift: {
      moderate: 0.08,
    },
  },
  api: {
    baseUrl: apiBaseUrl,
  },
  medvoice: {
    baseUrl: medvoiceBaseUrl,
    structureUrl: `${medvoiceBaseUrl}/api/structure`,
    exportUrl: `${medvoiceBaseUrl}/api/export`,
    wsRecordUrl: `${medvoiceWsBaseUrl}/ws/record`,
  },
  storage: {
    sessionKey: 'rehab_session',
    patientKey: 'rehab_patient',
  },
} as const;

export default CONFIG;
