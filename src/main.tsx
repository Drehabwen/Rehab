import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { startGalenConnectorBridge } from './lib/galenConnector'
import './index.css'

startGalenConnectorBridge()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
