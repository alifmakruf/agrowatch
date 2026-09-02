import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AppDataProvider } from './context/AppDataContext.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { GoogleOAuthProvider } from '@react-oauth/google'

import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'react-datepicker/dist/react-datepicker.css';

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '1049785053054-547g9pvl06jf78k5su5c0mqj8rd8srft.apps.googleusercontent.com';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <GoogleOAuthProvider clientId={googleClientId}>
        <AppDataProvider>
          <App />
        </AppDataProvider>
      </GoogleOAuthProvider>
    </ErrorBoundary>
  </StrictMode>,
)

