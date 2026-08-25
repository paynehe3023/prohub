"""
rembg ID Photo Service — Standalone background removal server for ProHub

Usage:
  python rembg-server.py              # default: port 8080, model u2net_human_seg
  python rembg-server.py --port 5000 --model u2net_cloth_seg

API Endpoints:
  POST /api/remove-bg    → multipart form with 'file', returns PNG with transparent bg
  POST /api/replace-bg   → multipart form with 'file' + 'color' (e.g. '43,8EDB'), returns PNG with solid bg
  GET /health            → {"status":"ok","model":"...","uptime":...}
"""

import argparse
import io
import sys
import time
import logging
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse
from PIL import Image

from rembg import remove

# Config
START_TIME = time.time()
MODEL = "u2net_human_seg"

logging.basicConfig(level=logging.INFO, format="%(asctime)s [rembg] %(message)s")
logger = logging.getLogger("rembg-server")


class RembgHandler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        logger.info(fmt % args)

    def do_GET(self):
        if self.path == "/health":
            uptime = time.time() - START_TIME
            resp = {"status": "ok", "model": MODEL, "uptime": round(uptime, 1)}
            self._json(200, resp)
        else:
            self._json(404, {"error": "not found"})

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/remove-bg":
            self._handle_remove_bg()
        elif parsed.path == "/api/replace-bg":
            qs = parse_qs(parsed.query)
            self._handle_replace_bg(qs)
        else:
            self._json(404, {"error": "not found"})

    def _handle_remove_bg(self):
        try:
            content_type = self.headers.get("Content-Type", "")
            length = int(self.headers.get("Content-Length", 0))
            if "multipart" not in content_type or length == 0:
                self._json(400, {"error": "multipart/form-data with 'file' field required"})
                return

            boundary = content_type.split("boundary=")[1]
            raw = self.rfile.read(length)
            files = self._parse_multipart(raw, boundary)
            image_data = files.get("file")
            if not image_data:
                self._json(400, {"error": "'file' field required"})
                return

            img = Image.open(io.BytesIO(image_data))
            result = remove(img, post_process_mask=True)

            buf = io.BytesIO()
            result.save(buf, format="PNG")
            self._binary(200, buf.getvalue(), "image/png")
        except Exception as e:
            logger.exception("remove-bg error")
            self._json(500, {"error": str(e)})

    def _handle_replace_bg(self, qs):
        color = qs.get("color", ["255,255,255"])[0]
        try:
            r, g, b = map(int, color.split(","))
        except ValueError:
            self._json(400, {"error": "color must be R,G,B (e.g. 67,142,219)"})
            return

        try:
            content_type = self.headers.get("Content-Type", "")
            length = int(self.headers.get("Content-Length", 0))
            if "multipart" not in content_type or length == 0:
                self._json(400, {"error": "multipart/form-data with 'file' field required"})
                return

            boundary = content_type.split("boundary=")[1]
            raw = self.rfile.read(length)
            files = self._parse_multipart(raw, boundary)
            image_data = files.get("file")
            if not image_data:
                self._json(400, {"error": "'file' field required"})
                return

            img = Image.open(io.BytesIO(image_data))
            # Remove background
            transparent = remove(img, post_process_mask=True)
            # Composite with solid color
            bg = Image.new("RGBA", transparent.size, (r, g, b, 255))
            result = Image.alpha_composite(bg, transparent)

            buf = io.BytesIO()
            result.save(buf, format="PNG")
            self._binary(200, buf.getvalue(), "image/png")
        except Exception as e:
            logger.exception("replace-bg error")
            self._json(500, {"error": str(e)})

    def _parse_multipart(self, raw: bytes, boundary: str) -> dict:
        """Parse multipart form data and return dict of field_name -> bytes."""
        files = {}
        boundary_bytes = f"--{boundary}".encode()
        parts = raw.split(boundary_bytes)

        for part in parts[1:-1]:  # skip first empty and last '--'
            # Extract field name
            header_end = part.find(b"\r\n\r\n")
            if header_end == -1:
                continue
            headers = part[:header_end].decode("utf-8", errors="replace")
            data = part[header_end + 4:-2]  # strip trailing \r\n

            # Parse Content-Disposition
            for line in headers.split("\r\n"):
                if "name=" in line.lower():
                    name_start = line.index('name="') + 6
                    name_end = line.index('"', name_start)
                    name = line[name_start:name_end]
                    files[name] = data
                    break

        return files

    def _json(self, status, obj):
        import json
        body = json.dumps(obj).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def _binary(self, status, data, content_type):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(data)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8080)
    parser.add_argument("--model", default="u2net_human_seg")
    args = parser.parse_args()

    global MODEL
    MODEL = args.model

    server = HTTPServer(("0.0.0.0", args.port), RembgHandler)
    logger.info(f"rembg server started on port {args.port}, model={MODEL}")
    logger.info(f"Endpoints: POST /api/remove-bg, POST /api/replace-bg?color=R,G,B, GET /health")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        logger.info("Shutting down...")
        server.shutdown()


if __name__ == "__main__":
    main()
