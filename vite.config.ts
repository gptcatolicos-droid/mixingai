
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { resolve } from 'node:path'
import AutoImport from 'unplugin-auto-import/vite'

const isDev = process.env.NODE_ENV === 'development';

const SECURITY_HEADERS = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://sdk.mercadopago.com https://www.paypal.com https://www.sandbox.paypal.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
    "font-src 'self' data: https://fonts.gstatic.com https://cdn.jsdelivr.net",
    "img-src 'self' data: blob: https:",
    "media-src 'self' blob:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.mercadopago.com https://www.paypal.com https://www.sandbox.paypal.com https://mixingmusic.ai",
    "frame-src https://www.paypal.com https://www.sandbox.paypal.com https://sdk.mercadopago.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' https://www.paypal.com https://sdk.mercadopago.com",
  ].join('; '),
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(self), geolocation=()',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
  'Cross-Origin-Resource-Policy': 'same-origin',
};

export default defineConfig({
  define: {
   __BASE_PATH__: JSON.stringify('/'),
   __IS_PREVIEW__: JSON.stringify(false)
  },
  plugins: [react(),
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
  },
  resolve: {
    alias: { '@': resolve(__dirname, './src') }
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    headers: SECURITY_HEADERS,
    cors: {
      origin: ['https://mixingmusic.ai', 'https://www.mixingmusic.ai', ...(isDev ? ['http://localhost:3000','http://localhost:5173'] : [])],
      methods: ['GET','POST','PUT','DELETE','OPTIONS'],
      allowedHeaders: ['Content-Type','Authorization','X-Requested-With'],
      credentials: true,
    },
  },
  preview: {
    headers: SECURITY_HEADERS,
  },
})
