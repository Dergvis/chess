import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {resolve} from 'node:path';
const routes=['','play','chess-games-for-kids','online-chess-for-kids','learn-chess-for-kids','how-to-play-chess-for-kids','chess-puzzles-for-kids','parents'];
export default defineConfig({plugins:[react()],build:{outDir:'dist',rollupOptions:{input:Object.fromEntries([...routes.map(p=>[p||'home',resolve(p,'index.html')]),['404',resolve('404.html')]])}},worker:{format:'es'}});
