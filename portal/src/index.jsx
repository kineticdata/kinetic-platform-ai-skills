import React from 'react';
import ReactDOM from 'react-dom/client';
import { KineticLib } from '@kineticdata/react';
import { HashRouter } from 'react-router-dom';
import { App } from './App.jsx';

const globals = import('./globals.js');

ReactDOM.createRoot(document.getElementById('root')).render(
  <KineticLib globals={globals} locale="en">
    {kineticProps => (
      <HashRouter>
        <App {...kineticProps} />
      </HashRouter>
    )}
  </KineticLib>
);
