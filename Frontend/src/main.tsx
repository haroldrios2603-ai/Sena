/**
 * Archivo fuente que requiere comentarios descriptivos.
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import './i18n'

// Punto de entrada de la aplicación React.
// Inicializa el renderizado del árbol de componentes y carga el proveedor de i18n.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
