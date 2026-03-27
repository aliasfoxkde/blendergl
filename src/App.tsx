import { Routes, Route } from "react-router-dom";
import { LandingPage } from "./landing/components/LandingPage";
import { EditorShell } from "./editor/components/EditorShell";
import { ErrorBoundary } from "./components/ErrorBoundary";

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/editor" element={<EditorShell />} />
      </Routes>
    </ErrorBoundary>
  );
}
