import React from 'react';
import '@carbon/styles/css/styles.css';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register service worker — auto-reloads the app on every new deploy
serviceWorkerRegistration.register();
