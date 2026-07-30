import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Configuración de Vite para construir el frontend sin alterar la lógica de la aplicación.
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Se separan dependencias pesadas en chunks independientes para mejorar la carga inicial.
          if (id.includes('node_modules')) {
            if (id.includes('recharts')) {
              return 'vendor-charts';
            }
            if (id.includes('react-router-dom')) {
              return 'vendor-router';
            }
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor-react';
            }
            if (id.includes('i18next') || id.includes('react-i18next')) {
              return 'vendor-i18n';
            }
            return 'vendor';
          }
        },
      },
    },
  },
});
