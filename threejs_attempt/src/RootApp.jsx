import { useState } from "react";
import App from "./App";
import LandingPage from "./components/LandingPage";

export default function RootApp() {
  const [enteredLab, setEnteredLab] = useState(false);

  if (!enteredLab) {
    return <LandingPage onStart={() => setEnteredLab(true)} />;
  }

  return <App />;
}
