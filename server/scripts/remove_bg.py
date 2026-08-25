"""rembg background removal — called by ProHub Node.js backend
Usage: python remove_bg.py <input_path> <output_path>
"""
import sys, io
from rembg import remove
from PIL import Image

def main():
    if len(sys.argv) != 3:
        print("Usage: python remove_bg.py <input> <output>")
        sys.exit(1)

    input_path, output_path = sys.argv[1], sys.argv[2]

    with open(input_path, 'rb') as f:
        input_bytes = f.read()

    output_bytes = remove(input_bytes)

    with open(output_path, 'wb') as f:
        f.write(output_bytes)

    print(f"OK {len(output_bytes)} bytes")

if __name__ == '__main__':
    main()
