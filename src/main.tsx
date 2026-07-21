import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './styles/main.css'
import { ToastProvider } from './context/ToastContext.tsx'
import { CartProvider } from './context/CartContext.tsx'
import App from './App.tsx'
import AnalyticsProvider from './components/AnalyticsProvider.tsx'

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Failed to find the root element');
}

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AnalyticsProvider>
        <ToastProvider>
          <CartProvider>
            <App />
          </CartProvider>
        </ToastProvider>
      </AnalyticsProvider>
    </BrowserRouter>
  </StrictMode>,
)
import { registerSW } from 'virtual:pwa-register'

registerSW({
  onNeedRefresh() {
    // We could show a toast here in the future
  },
  onOfflineReady() {
    // App is ready to work offline
  },
})
