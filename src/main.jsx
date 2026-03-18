import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { UiProvider } from './hooks/useUi';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <UiProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </UiProvider>
  </StrictMode>,
);
