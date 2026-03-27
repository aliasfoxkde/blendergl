import { Routes, Route } from "react-router-dom";
import { LandingPage } from "./landing/components/LandingPage";
import { EditorShell } from "./editor/components/EditorShell";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/editor" element={<EditorShell />} />
    </Routes>
  );
}
