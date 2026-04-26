import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

requestAnimationFrame(() => {
  const loading = document.getElementById('loading-screen')
  if (loading) {
    loading.style.opacity = '0'
    loading.style.visibility = 'hidden'
    setTimeout(() => loading.remove(), 300)
  }
})