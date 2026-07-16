import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import type {} from '@mui/x-data-grid/themeAugmentation';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import './admin.css';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#244a73',
    },
    background: {
      default: '#eef2f6',
    },
  },
  shape: {
    borderRadius: 10,
  },
  components: {
    MuiDataGrid: {
      styleOverrides: {
        columnHeaders: {
          backgroundColor: '#e0e0e0',
        },
        columnHeader: {
          backgroundColor: '#e0e0e0',
        },
        filler: {
          backgroundColor: '#e0e0e0',
        },
        columnHeaderTitle: {
          fontWeight: 700,
        },
        row: {
          '&.Mui-selected': {
            backgroundColor: '#244a73',
            color: '#ffffff',
          },
          '&.Mui-selected:hover': {
            backgroundColor: '#244a73',
          },
        },
      },
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>,
);
