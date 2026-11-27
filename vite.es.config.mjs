// Second build: Spanish game and pages under /es/. Shares dist/ with the English build.
import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {resolve} from 'node:path';
import chezziesLocale from './scripts/i18n/vite-locale.mjs';
import {pages} from './scripts/content-es.mjs';
const routes=['es','es/play',...pages.map(p=>'es/'+p.slug)];
export default defineConfig({plugins:[chezziesLocale('es'),react()],build:{outDir:'dist',emptyOutDir:false,rollupOptions:{input:Object.fromEntries(routes.map(p=>[p.replaceAll('/','-'),resolve(p,'index.html')]))}},worker:{format:'es',plugins:()=>[chezziesLocale('es')]}});
