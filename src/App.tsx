import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { NexusHub } from "@/hub/NexusHub";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/*" element={<NexusHub />} />
      </Routes>
    </Router>
  );
}
