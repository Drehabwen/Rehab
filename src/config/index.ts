const DEFAULT_API_BASE_URL = 'http://localhost:8002';
const DEFAULT_WS_URL = 'ws://localhost:8002/ws/analyze';

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');
const trimLeadingSlash = (value: string) => value.replace(/^\/+/, '');
const getRuntimeHost = () => {
  if (typeof window === 'undefined') {
    return 'localhost';
  }
  const host = window.location.hostname?.trim();
  return host || 'localhost';
};
const getRuntimeOrigin = () => {
  if (typeof window === 'undefined') {
    return 'http://localhost:5173';
  }
  return window.location.origin;
};

const toWebSocketBaseUrl = (value: string) => {
  const normalized = trimTrailingSlash(value);
  if (normalized.startsWith('https://')) return `wss://${normalized.slice('https://'.length)}`;
  if (normalized.startsWith('http://')) return `ws://${normalized.slice('http://'.length)}`;
  return normalized;
};

const runtimeApiBaseUrl = `http://${getRuntimeHost()}:8002`;
const runtimeDevOrigin = getRuntimeOrigin();
const runtimeDevWsBaseUrl = toWebSocketBaseUrl(runtimeDevOrigin);
const apiBaseUrl = trimTrailingSlash(
  import.meta.env.VITE_API_BASE_URL
  ?? (import.meta.env.DEV ? '' : runtimeApiBaseUrl)
  ?? DEFAULT_API_BASE_URL,
);
const websocketUrl = import.meta.env.VITE_WS_URL
  ?? (import.meta.env.DEV ? `${runtimeDevWsBaseUrl}/ws/analyze` : DEFAULT_WS_URL);
const medvoiceBaseUrl = trimTrailingSlash(
  import.meta.env.VITE_MEDVOICE_BASE_URL
  ?? (import.meta.env.DEV ? '/medvoice' : `${apiBaseUrl}/medvoice`),
);
const medvoiceWsBaseUrl = medvoiceBaseUrl.startsWith('/')
  ? `${runtimeDevWsBaseUrl}/${trimLeadingSlash(medvoiceBaseUrl)}`
  : toWebSocketBaseUrl(medvoiceBaseUrl);

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
