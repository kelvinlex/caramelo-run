import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  const publicDir = path.resolve(import.meta.dirname, 'public');

  return {
    plugins: [
      {
        name: 'serve-ignored-public-assets',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            const rawUrl = req.url ? req.url.split('?')[0] : '';
            if (
              !rawUrl.startsWith('/assets/') &&
              !rawUrl.startsWith('/models/') &&
              !rawUrl.startsWith('/sounds/') &&
              !rawUrl.startsWith('/images/')
            ) {
              return next();
            }
            const safeRel = path.normalize(decodeURIComponent(rawUrl)).replace(/^(\.\.(\/|\\|$))+/, '');
            const fullPath = path.join(publicDir, safeRel);
            if (!fullPath.startsWith(publicDir) || !fs.existsSync(fullPath)) return next();
            const stat = fs.statSync(fullPath);
            if (!stat.isFile()) return next();

            const ext = path.extname(fullPath).toLowerCase();
            const mime =
              ext === '.glb'
                ? 'model/gltf-binary'
                : ext === '.gltf'
                ? 'model/gltf+json'
                : ext === '.png'
                ? 'image/png'
                : ext === '.jpg' || ext === '.jpeg'
                ? 'image/jpeg'
                : ext === '.mp3'
                ? 'audio/mpeg'
                : ext === '.wav'
                ? 'audio/wav'
                : 'application/octet-stream';

            res.setHeader('Content-Type', mime);
            res.setHeader('Content-Length', stat.size);
            res.setHeader('Cache-Control', 'public, max-age=3600');
            if (req.method === 'HEAD') {
              res.statusCode = 200;
              res.end();
              return;
            }
            fs.createReadStream(fullPath).pipe(res);
          });
        },
      },
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: {
        ignored: ['**/*.glb', '**/*.fbx', '**/public/assets/**', '**/*.mp4'],
      },
    },
  };
});
