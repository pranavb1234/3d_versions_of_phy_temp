import { useEffect, useState } from "react";
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

  useEffect(() => {
    document.body.classList.toggle("lab-active", enteredLab);
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });

    return () => {
      document.body.classList.remove("lab-active");
    };
  }, [enteredLab]);

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
