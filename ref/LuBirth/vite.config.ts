import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: "./", // 使用相对路径，适合子目录部署
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});

