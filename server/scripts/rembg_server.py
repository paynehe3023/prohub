"""rembg background removal HTTP server
Usage: python rembg_server.py --port=5000
Endpoints:
  POST /remove-bg   { "image": "base64..." } → { "image": "base64..." }
"""
import io, json, sys, argparse
from http.server import HTTPServer, BaseHTTPRequestHandler

try:
    from rembg import remove
    print("[rembg-server] rembg loaded OK")
except ImportError:
    print("[rembg-server] ERROR: rembg not installed. Run: uv pip install rembg")
    sys.exit(1)

class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path != '/remove-bg':
            self.send_error(404); return
        try:
            length = int(self.headers.get('Content-Length', 0))
            body = json.loads(self.rfile.read(length))
            b64 = body.get('image', '')
            if not b64:
                self.send_json(400, {'error': 'missing image'})
                return

            # Decode base64
            b64_clean = b64.replace('data:image/png;base64,', '').replace('data:image/jpeg;base64,', '')
            import base64
            input_bytes = base64.b64decode(b64_clean)
            print(f"[rembg-server] Processing {len(input_bytes)} bytes")
            output_bytes = remove(input_bytes)
            output_b64 = base64.b64encode(output_bytes).decode()
            self.send_json(200, {'success': True, 'image': 'data:image/png;base64,' + output_b64})
        except Exception as e:
            print(f"[rembg-server] Error: {e}")
            self.send_json(500, {'error': str(e)})

    def send_json(self, code, data):
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('--port', type=int, default=5000)
    args = p.parse_args()
    server = HTTPServer(('127.0.0.1', args.port), Handler)
    print(f'[rembg-server] Listening on http://127.0.0.1:{args.port}')
    server.serve_forever()
