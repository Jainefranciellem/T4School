import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { watchForNewVersion } from "./lib/version-check";

createRoot(document.getElementById("root")!).render(<App />);

watchForNewVersion();

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker
            .register('/sw.js')
            .then(() => console.log('✅ Service Worker registrado'))
            .catch(err => console.error('❌ Erro ao registrar SW', err));
    });
}
