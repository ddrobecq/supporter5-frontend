import { CssBaseline } from '@mui/material';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import './admin.css';
import { AppearanceProvider } from './theme/AppearanceProvider';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppearanceProvider>
      <CssBaseline />
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </AppearanceProvider>
  </StrictMode>,
);
