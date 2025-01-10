import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"
import { viteStaticCopy } from 'vite-plugin-static-copy'
export default defineConfig((env) => {
  const viteEnv = loadEnv(env.mode, process.cwd()) as unknown as ImportMeta
  return {
    plugins: [
      react(),
      viteStaticCopy({
        targets: [
          {
            src: 'node_modules/@ricky0123/vad-web/dist/vad.worklet.bundle.min.js',
            dest: 'assets'
          },
          {
            src: 'node_modules/@ricky0123/vad-web/dist/*.onnx',
            dest: 'assets'
          },
          {
            src: 'node_modules/onnxruntime-web/dist/*.wasm',
            dest: 'assets'
          },
          {
            src: 'node_modules/onnxruntime-web/dist/*.mjs',
            dest: 'assets'
          }
        ]
      })
    ],
    optimizeDeps: {
      exclude: ['onnxruntime-web']
    },
    server: {
      host: '0.0.0.0',
      port: 1002,
      open: false,
      proxy: {
        '/api': {
          target: viteEnv.VITE_APP_API_BASE_URL,
          changeOrigin: true, // 允许跨域
          rewrite: path => path.replace('/api/', '/'),
        },
      },
    },
    build: {
      commonjsOptions: {
        include: [/onnxruntime-web/, /node_modules/]
      }
    },
    resolve: {
      alias: {
        "@": path.resolve(process.cwd(), "./src"),
      },
    },
  }
})
