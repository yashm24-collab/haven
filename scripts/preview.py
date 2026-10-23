#!/usr/bin/env python3
"""Serve the real launcher with demo data. Python standard library only."""
import argparse
import hashlib
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import mimetypes
import shutil
from pathlib import Path
from urllib.parse import unquote, urlsplit
import webbrowser

ROOT = Path(__file__).resolve().parents[1]
LAUNCHER = ROOT / 'launcher'
LAUNCHER_FILES = {
    'index.html', 'style.css', 'renewal-panel.css', 'app.js', 'config.js',
    'user-data.js', 'update-panel.js', 'renewal-panel.js', 'profile-bootstrap.js',
    'native-bootstrap.js', 'helper-control.js', 'fonts/outfit.ttf', 'fonts/OFL.txt',
    'lumen-math.js', 'marks.js',
} | {p.relative_to(LAUNCHER).as_posix()                      # Haven's videos, Rive orb, fonts and brand marks
     for folder in ('assets', 'fonts', 'marks') for p in (LAUNCHER / folder).iterdir() if p.is_file()}
DEMO_APPS = [
    ('youtube', 'YouTube', '#ffffff'),
    ('netflix', 'Netflix', '#ffffff'),
    ('apple', 'Apple TV', '#000000'),
    ('disney', 'Disney+', '#071b53'),
    ('browser', 'Web Browser', '#5c75b8'),
    ('emby', 'Emby', '#333333'),
    ('prime', 'Prime Video', '#00a8e1'),
    ('spotify', 'Spotify', '#191414'),
    ('twitch', 'Twitch', '#9146ff'),
    ('hbomax', 'HBO Max', '#5822b4'),
]
ICON_FILES = {app_id + '.svg' for app_id, _, _ in DEMO_APPS}


def inventory():
    apps = [{'id': 'preview.' + app_id, 'title': title,
             'icon': '../preview/icons/' + app_id + '.svg', 'iconColor': color}
            for app_id, title, color in DEMO_APPS]
    return {'apps': apps, 'inputs': [
        {'label': 'HDMI 1 · Console', 'appId': 'preview.hdmi1'},
        {'label': 'HDMI 2 · Media player', 'appId': 'preview.hdmi2'},
    ]}


def revision():
    files = [ROOT / 'launcher' / name for name in sorted(LAUNCHER_FILES)]
    files += [ROOT / 'preview/index.html', ROOT / 'preview/bridge.js', ROOT / 'preview/live-reload.js']
    files += [ROOT / 'preview/icons' / name for name in sorted(ICON_FILES)]
    stamps = []
    for file in files:
        try:
            stat = file.stat()
            stamps.append((stat.st_mtime_ns, stat.st_size))
        except FileNotFoundError:
            stamps.append(None)
    return hashlib.sha256(json.dumps(stamps).encode()).hexdigest()


def launcher_html():
    return (ROOT / 'launcher/index.html').read_text().replace(
        '<head>', '<head>\n  <script src="../preview/bridge.js"></script>', 1)


def preview_html(live=True):
    script = ('<script src="preview/live-reload.js" data-version="' + revision() + '"></script>') if live else ''
    page = (ROOT / 'preview/index.html').read_text().replace('__LIVE_RELOAD__', script)
    return page if live else page.replace('live reload enabled', 'latest main build').replace('Home · Local Preview', 'Home · Preview')


def export_site(destination):
    destination = Path(destination)
    destination.mkdir(parents=True, exist_ok=True)
    for name in sorted(LAUNCHER_FILES):
        target = destination / 'launcher' / name
        target.parent.mkdir(parents=True, exist_ok=True)
        if name == 'index.html':
            target.write_text(launcher_html(), encoding='utf-8')
        else:
            shutil.copyfile(ROOT / 'launcher' / name, target)
    (destination / 'launcher/apps.js').write_text('window.TV_APPS = ' + json.dumps(inventory()) + ';\n', encoding='utf-8')
    for name in ['bridge.js', 'icons/SOURCES.txt', 'icons/LICENSE-LUCIDE.txt'] + ['icons/' + name for name in sorted(ICON_FILES)]:
        target = destination / 'preview' / name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(ROOT / 'preview' / name, target)
    (destination / 'index.html').write_text(preview_html(live=False), encoding='utf-8')
    (destination / '.nojekyll').touch()
    for name in ['LICENSE', 'THIRD_PARTY_NOTICES.md']:
        shutil.copyfile(ROOT / name, destination / name)


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        path = unquote(urlsplit(self.path).path)
        file = None
        if path == '/preview/version':
            self.respond(revision().encode(), 'text/plain; charset=utf-8')
            return
        if path == '/':
            file = ROOT / 'preview/index.html'
        elif path in ('/preview/bridge.js', '/preview/live-reload.js'):
            file = ROOT / path.lstrip('/')
        elif path.startswith('/preview/icons/') and path[len('/preview/icons/'):] in ICON_FILES:
            file = ROOT / path.lstrip('/')
        elif path == '/launcher/apps.js':
            self.respond(('window.TV_APPS = ' + json.dumps(inventory()) + ';\n').encode(),
                         'text/javascript; charset=utf-8')
            return
        elif path.startswith('/launcher/') and path[len('/launcher/'):] in LAUNCHER_FILES:
            file = ROOT / path.lstrip('/')
        if file is None:
            self.send_error(404)
            return
        try:
            body = file.read_bytes()
        except FileNotFoundError:
            self.send_error(404)
            return
        if path == '/':
            body = preview_html().encode('utf-8')
        if path == '/launcher/index.html':
            body = launcher_html().encode('utf-8')
        mime = mimetypes.guess_type(file.name)[0] or 'application/octet-stream'
        self.respond(body, mime)

    def respond(self, body, mime):
        self.send_response(200)
        self.send_header('Content-Type', mime)
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.end_headers()
        self.wfile.write(body)

    def log_request(self, code='-', size='-'):
        if urlsplit(self.path).path != '/preview/version':
            super().log_request(code, size)


def make_server(port):
    return ThreadingHTTPServer(('127.0.0.1', port), Handler)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=8765)
    parser.add_argument('--open', action='store_true', help='open preview in the default browser')
    parser.add_argument('--build', type=Path, metavar='DIRECTORY', help='export a static preview for GitHub Pages')
    args = parser.parse_args()
    if args.build:
        export_site(args.build)
        print(f'Static preview: {args.build}')
        return
    with make_server(args.port) as server:
        url = f'http://127.0.0.1:{server.server_port}/'
        print(f'Launcher preview: {url}\nStop: Ctrl+C', flush=True)
        if args.open:
            webbrowser.open(url)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == '__main__':
    main()
