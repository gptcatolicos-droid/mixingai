#!/usr/bin/env python3
"""
demucs_api.py - Servidor HTTP simple para separar stems con Demucs
Instalar en RunPod y correr con: python3 demucs_api.py

Requiere: pip install demucs flask
"""
import base64
import io
import json
import os
import tempfile
from http.server import HTTPServer, BaseHTTPRequestHandler
import subprocess
import sys

try:
    import demucs.separate
    DEMUCS_AVAILABLE = True
except ImportError:
    DEMUCS_AVAILABLE = False
    print("Demucs no instalado. Instalar con: pip install demucs")

PORT = 8765

class DemucsHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_POST(self):
        if self.path != '/demucs':
            self.send_error(404)
            return

        length = int(self.headers.get('Content-Length', 0))
        body = json.loads(self.rfile.read(length))
        
        audio_b64 = body.get('audio', '')
        mime_type = body.get('mime_type', 'audio/wav')
        model = body.get('model', 'htdemucs')
        
        try:
            # Decodificar audio
            audio_bytes = base64.b64decode(audio_b64)
            
            with tempfile.TemporaryDirectory() as tmpdir:
                # Guardar audio de entrada
                ext = 'wav' if 'wav' in mime_type else 'mp3'
                input_path = os.path.join(tmpdir, f'input.{ext}')
                with open(input_path, 'wb') as f:
                    f.write(audio_bytes)
                
                out_dir = os.path.join(tmpdir, 'output')
                os.makedirs(out_dir, exist_ok=True)
                
                # Correr Demucs
                cmd = [
                    sys.executable, '-m', 'demucs',
                    '--name', model,
                    '--out', out_dir,
                    '--mp3',  # output como mp3 para reducir tamaño
                    input_path
                ]
                result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
                
                if result.returncode != 0:
                    raise Exception(f"Demucs error: {result.stderr}")
                
                # Leer stems generados
                stem_dir = os.path.join(out_dir, model, 'input')
                stems = {}
                stem_names = []
                
                for fname in sorted(os.listdir(stem_dir)):
                    if fname.endswith('.mp3') or fname.endswith('.wav'):
                        stem_name = fname.replace('.mp3', '').replace('.wav', '')
                        with open(os.path.join(stem_dir, fname), 'rb') as sf:
                            stems[stem_name] = base64.b64encode(sf.read()).decode()
                            stem_names.append(stem_name)
                
                response = {
                    'success': True,
                    'stems': stems,
                    'stem_names': stem_names,
                    'model': model,
                }
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps(response).encode())
                
        except Exception as e:
            error = {'error': str(e), 'success': False}
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(error).encode())

    def log_message(self, format, *args):
        print(f"[Demucs API] {format % args}")

if __name__ == '__main__':
    print(f"Demucs disponible: {DEMUCS_AVAILABLE}")
    print(f"Iniciando servidor en puerto {PORT}...")
    server = HTTPServer(('0.0.0.0', PORT), DemucsHandler)
    print(f"Listo en http://0.0.0.0:{PORT}/demucs")
    server.serve_forever()
