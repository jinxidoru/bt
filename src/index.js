import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import {App} from './bt/main';
import reportWebVitals from './reportWebVitals';

// reset the local storage state
if (window.location.search.indexOf('reset') !== -1) {
  localStorage.clear()
  window.location.replace('/')

// normal
} else {
  ReactDOM.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
    document.getElementById('root')
  );

  // If you want to start measuring performance in your app, pass a function
  // to log results (for example: reportWebVitals(console.log))
  // or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
  reportWebVitals();
}
