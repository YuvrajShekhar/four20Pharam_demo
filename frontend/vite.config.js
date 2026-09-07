import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  preview: {
    // Vite's preview server checks the Host header by default and rejects
    // unrecognized hosts. Railway's public domain isn't known in advance,
    // so allow any host here. Fine for this POC (no auth); for a real
    // deployment you'd pin this to the exact known domain instead.
    allowedHosts: true,
  },
})