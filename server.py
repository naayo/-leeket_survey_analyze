#!/usr/bin/env python3
"""
Simple HTTP Server for Leeket Dashboard
Serves the dashboard on localhost:8085 for local testing
"""

import os
import sys
import http.server
import socketserver
from pathlib import Path

# Configuration
PORT = 8085
DIRECTORY = Path(__file__).parent

class CORSHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    """HTTP Request Handler with CORS support for Google Sheets API calls"""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        """Add CORS headers to all responses"""
        self.send_cors_headers()
        super().end_headers()

    def send_cors_headers(self):
        """Send CORS headers to allow external API calls"""
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
        self.send_header('Access-Control-Max-Age', '3600')

    def do_OPTIONS(self):
        """Handle preflight OPTIONS requests"""
        self.send_response(200)
        self.send_cors_headers()
        self.end_headers()

    def log_message(self, format, *args):
        """Custom logging format"""
        print(f"[{self.log_date_time_string()}] {format % args}")

def main():
    """Start the HTTP server"""

    # Change to the project directory
    os.chdir(DIRECTORY)

    print("=" * 60)
    print("🚀 LEEKET DASHBOARD LOCAL SERVER")
    print("=" * 60)
    print(f"📁 Serving directory: {DIRECTORY}")
    print(f"🌐 Server running on: http://localhost:{PORT}")
    print("=" * 60)
    print("📋 Available pages:")
    print(f"   • Login page:         http://localhost:{PORT}/")
    print(f"   • Dashboard:          http://localhost:{PORT}/dashboard.html")
    print(f"   • Test connection:    http://localhost:{PORT}/test-connection-v2.html")
    print(f"   • Original test:      http://localhost:{PORT}/test-connection.html")
    print("=" * 60)
    print("🔧 Features enabled:")
    print("   • CORS headers for Google Sheets API")
    print("   • Static file serving")
    print("   • Auto-reload on file changes")
    print("=" * 60)
    print("ℹ️  Press Ctrl+C to stop the server")
    print("=" * 60)

    try:
        with socketserver.TCPServer(("", PORT), CORSHTTPRequestHandler) as httpd:
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n" + "=" * 60)
        print("🛑 Server stopped by user")
        print("=" * 60)
    except OSError as e:
        if e.errno == 48:  # Address already in use
            print("\n" + "=" * 60)
            print(f"❌ ERROR: Port {PORT} is already in use")
            print("💡 Try:")
            print(f"   • Kill the process using port {PORT}")
            print(f"   • Use a different port")
            print(f"   • Run: lsof -ti:{PORT} | xargs kill")
            print("=" * 60)
        else:
            print(f"\n❌ ERROR: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()