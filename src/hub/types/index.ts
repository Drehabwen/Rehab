export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  icon: string; // SVG path or Lucide icon name
  category: 'analysis' | 'communication' | 'records' | 'utility';
  entry: React.ComponentType<any>;
  accentColor?: string;
}

export interface HubState {
  activePluginId: string | null;
  isSidebarCollapsed: boolean;
  hardwareStatus: {
    camera: 'connected' | 'disconnected' | 'error';
    microphone: 'connected' | 'disconnected' | 'error';
  };
}
