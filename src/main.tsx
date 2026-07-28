import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './styles/main.css'
import { ToastProvider } from './context/ToastContext.tsx'
import { CartProvider } from './context/CartContext.tsx'
import { AuthProvider } from './context/AuthContext.tsx'
import App from './App.tsx'
import AnalyticsProvider from './components/AnalyticsProvider.tsx'

import { ProductProvider, useProducts } from './context/ProductContext.tsx'

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Failed to find the root element');
}

function AppWithProducts() {
  const { loading, error, refreshProducts } = useProducts();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#FEFDF8',
        fontFamily: '"Plus Jakarta Sans", sans-serif',
        color: '#1A1A1A',
        padding: '20px',
        textAlign: 'center'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid #F5F0E8',
          borderTop: '4px solid #2D5016',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: '20px'
        }} />
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
        <p style={{ fontSize: '14px', fontWeight: 500, color: '#667068' }}>Loading product information...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#FEFDF8',
        fontFamily: '"Plus Jakarta Sans", sans-serif',
        color: '#1A1A1A',
        padding: '24px',
        textAlign: 'center'
      }}>
        <div style={{
          maxWidth: '400px',
          padding: '32px',
          backgroundColor: '#FFFFFF',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(29, 58, 40, 0.05)',
          border: '1px solid #EAE5D9'
        }}>
          <h1 style={{
            fontFamily: '"Playfair Display", serif',
            fontSize: '24px',
            color: '#1D3A28',
            marginBottom: '12px',
            fontWeight: 700
          }}>
            Store temporarily unavailable
          </h1>
          <p style={{
            fontSize: '14px',
            lineHeight: '1.6',
            color: '#667068',
            marginBottom: '24px'
          }}>
            We couldn't load the latest product information. Please try again.
          </p>
          <button
            onClick={refreshProducts}
            style={{
              padding: '12px 24px',
              backgroundColor: '#2D5016',
              color: '#FEFDF8',
              border: 'none',
              borderRadius: '4px',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
              outline: 'none',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#1D3A28')}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#2D5016')}
            onFocus={(e) => {
              e.currentTarget.style.boxShadow = '0 0 0 3px #C5A059';
            }}
            onBlur={(e) => {
              e.currentTarget.style.boxShadow = 'none';
            }}
            aria-label="Try reloading product information"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AnalyticsProvider>
        <ToastProvider>
          <AuthProvider>
            <CartProvider>
              <App />
            </CartProvider>
          </AuthProvider>
        </ToastProvider>
      </AnalyticsProvider>
    </BrowserRouter>
  );
}

function AppBootstrap() {
  return (
    <ProductProvider>
      <AppWithProducts />
    </ProductProvider>
  )
}

createRoot(rootElement).render(
  <StrictMode>
    <AppBootstrap />
  </StrictMode>
);
import { registerSW } from 'virtual:pwa-register'

registerSW({
  onNeedRefresh() {
    // We could show a toast here in the future
  },
  onOfflineReady() {
    // App is ready to work offline
  },
})
