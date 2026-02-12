import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { NexusHub } from "@/hub/NexusHub";
import RawCameraTest from "@/nexus-v2/pages/RawCameraTest";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

export default function App() {
  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          <Route path="/" element={<NexusHub />} />
          <Route path="/test-camera" element={<RawCameraTest />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}
