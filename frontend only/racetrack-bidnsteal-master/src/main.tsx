import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const rootElement = document.getElementById('root')!;

// Prevent createRoot from being called multiple times during HMR
if (!(window as any).__REACT_ROOT__) {
  (window as any).__REACT_ROOT__ = createRoot(rootElement);
}

(window as any).__REACT_ROOT__.render(
  <App />
);
