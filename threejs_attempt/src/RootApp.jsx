import { useState } from "react";
import App from "./App";
import LandingPage from "./components/LandingPage";

export default function RootApp() {
  const [enteredLab, setEnteredLab] = useState(false);
  const [launchContext, setLaunchContext] = useState({
    chapterId: "oscillations",
    simulationId: "single"
  });

  const handleStart = (selection) => {
    if (selection && typeof selection === "object") {
      setLaunchContext({
        chapterId: selection.chapterId ?? "oscillations",
        simulationId: selection.simulationId ?? "single"
      });
    }
    setEnteredLab(true);
  };

  if (!enteredLab) {
    return <LandingPage onStart={handleStart} />;
  }

  return (
    <App
      onBackToHome={() => setEnteredLab(false)}
      initialChapterId={launchContext.chapterId}
      initialSimulationId={launchContext.simulationId}
    />
  );
}
