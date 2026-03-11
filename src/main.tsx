import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App"
import ThemeProvider from "./theme/ThemeProvider"
import { ToastProvider } from "./components/ui/useToast"
import { initWithAutoRestore } from "./hooks/useAutoBackup"
import './index.css'

async function main() {
  const restoreResult = await initWithAutoRestore()
  if (restoreResult === "restored") {
    console.info("[Startup] Data restored from backup successfully")
  }

  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <ThemeProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </ThemeProvider>
    </React.StrictMode>
  )
}

main()