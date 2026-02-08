import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { MotorProvider } from './context/MotorContext.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <MotorProvider>
      <App />
    </MotorProvider>
  </React.StrictMode>,
)
