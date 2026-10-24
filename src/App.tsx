import { useMemo } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { NexusHub } from "@/hub/NexusHub";
import { KernelDemoPage } from "@/kernel/demo/KernelDemoPage";
import { KernelProvider } from "@/kernel/react";
import { getAppKernel } from "@/kernel";

export default function App() {
  // 内核单例：整个应用共用一份（HMR 下模块重载会重新创建，插件随之重装）
  const kernel = useMemo(() => getAppKernel(), []);
  return (
    <KernelProvider kernel={kernel}>
      <Router>
        <Routes>
          {/* 内核自检页（P-A）；正式插槽接入见 docs/PLUGIN_ARCHITECTURE.md */}
          <Route path="/kernel-demo" element={<KernelDemoPage />} />
          <Route path="/*" element={<NexusHub />} />
        </Routes>
      </Router>
    </KernelProvider>
  );
}
