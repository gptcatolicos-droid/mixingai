import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { resolve } from 'node:path'
import AutoImport from 'unplugin-auto-import/vite'

const isDev = process.env.NODE_ENV === 'development';

/**
 * Headers de seguridad actualizados para soportar:
 * - onnxruntime-web (WASM + SharedArrayBuffer)
 * - Web Workers con ES modules
 * - ACE-Step via RunPod (*.gradio.live + *.runpod.net)
 */
const SECURITY_HEADERS = {
  'Content-Security-Policy': [
    "default-src 'self'",
    // WASM requiere 'wasm-unsafe-eval' en script-src
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' https://sdk.mercadopago.com https://www.paypal.com https://www.sandbox.paypal.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
    "font-src 'self' data: https://fonts.gstatic.com https://cdn.jsdelivr.net",
    "img-src 'self' data: blob: https:",
    // blob: necesario para reproducir audio generado
    "media-src 'self' blob: data:",
    // Agregar dominios de RunPod y HuggingFace (para descarga del modelo ONNX)
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.mercadopago.com https://www.paypal.com https://www.sandbox.paypal.com https://mixingmusic.ai https://*.gradio.live https://*.runpod.net https://huggingface.co https://huggingface.co/*.resolve",
    "frame-src https://www.paypal.com https://www.sandbox.paypal.com https://sdk.mercadopago.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' https://www.paypal.com https://sdk.mercadopago.com",
    // WASM + SharedArrayBuffer requieren estas políticas
    "worker-src 'self' blob:",
  ].join('; '),

  // SharedArrayBuffer requiere estas dos cabeceras
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',

  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  // Permitir micrófono para grabación
  'Permissions-Policy': 'camera=(), microphone=(self), geolocation=()',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Cross-Origin-Resource-Policy': 'same-origin',
};

export default defineConfig({
  define: {
    __BASE_PATH__: JSON.stringify('/'),
    __IS_PREVIEW__: JSON.stringify(false),
  },

  plugins: [
    react(),
    AutoImport({
      imports: [
        {
          'react': [
            'React','useState','useEffect','useContext','useReducer','useCallback',
            'useMemo','useRef','useImperativeHandle','useLayoutEffect','useDebugValue',
            'useDeferredValue','useId','useInsertionEffect','useSyncExternalStore',
            'useTransition','startTransition','lazy','memo','forwardRef','createContext',
            'createElement','cloneElement','isValidElement'
          ]
        },
        {
          'react-router-dom': [
            'useNavigate','useLocation','useParams','useSearchParams',
            'Link','NavLink','Navigate','Outlet'
          ]
        },
        { 'react-i18next': ['useTranslation','Trans'] }
      ],
      dts: true,
    }),
  ],

  base: '/',

  build: {
    sourcemap: false,
    outDir: 'out',
    minify: 'esbuild',
    target: 'es2022', // Requerido para top-level await en workers
    rollupOptions: {
      output: {
        // Separar onnxruntime-web en su propio chunk para carga lazy
        manualChunks: (id) => {
          if (id.includes('onnxruntime-web')) return 'onnxruntime';
        },
      },
    },
  },

  // Necesario para que los archivos WASM de onnxruntime-web sean servidos correctamente
  optimizeDeps: {
    exclude: ['onnxruntime-web'],
  },

  resolve: {
    alias: { '@': resolve(__dirname, './src') },
  },

  // Configurar worker para que soporte ES modules
  worker: {
    format: 'es',
  },

  server: {
    port: 3000,
    host: '0.0.0.0',
    headers: SECURITY_HEADERS,
    cors: {
      origin: [
        'https://mixingmusic.ai',
        'https://www.mixingmusic.ai',
        ...(isDev ? ['http://localhost:3000', 'http://localhost:5173'] : []),
      ],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      credentials: true,
    },
  },

  preview: {
    headers: SECURITY_HEADERS,
  },
})
