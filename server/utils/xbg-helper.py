"""
X-Bogus signature generator for Douyin API calls
Usage: python xbg-helper.py "query_string" "user_agent"
Output: X-Bogus signature string
"""
import sys
import os

# Add douyin-dl-ref to path
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'douyin-dl-ref'))

from utils.xbogus import XBogus

def generate_xbogus(query_string, user_agent):
    signer = XBogus(user_agent=user_agent)
    signed_url, xb, _ = signer.build(query_string)
    return xb

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: python xbg-helper.py 'query_string' 'user_agent'")
        sys.exit(1)
    
    query_string = sys.argv[1]
    user_agent = sys.argv[2]
    
    try:
        xb = generate_xbogus(query_string, user_agent)
        print(xb)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
