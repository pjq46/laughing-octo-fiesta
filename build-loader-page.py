#!/usr/bin/env python3
"""从 index.pre-opt.html 生成拆分后的 index.html / 404.html。
用法：python3 build-loader-page.py [--keep-inline-csp]
"""
from pathlib import Path
import re, sys

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "index.pre-opt.html"

STRICT_CSP = (
    "default-src 'self'; "
    "script-src 'self' https://static.cloudflareinsights.com https://913ban.cc.cd; "
    "style-src 'self'; "
    "font-src 'self' data:; "
    "img-src 'self' data: blob:; "
    "media-src 'self' data: blob:; "
    "connect-src 'self' https://gcore.jsdelivr.net https://fastly.jsdelivr.net https://cdn.jsdelivr.net "
    "https://raw.githubusercontent.com https://data.jsdelivr.com https://cloudflareinsights.com "
    "https://static.cloudflareinsights.com https://913ban.cc.cd; "
    "frame-src 'self' data: blob:; worker-src 'self'; object-src 'none'; "
    "base-uri 'self' https://gcore.jsdelivr.net https://fastly.jsdelivr.net https://cdn.jsdelivr.net https://raw.githubusercontent.com; "
    "form-action 'self'"
)
# 游戏是通过 iframe srcdoc 注入的，srcdoc 文档会继承父页面 CSP；若游戏带内联脚本/样式，
# 就只能保留 'unsafe-inline'。见 README-加载器性能优化.txt 的说明。
LOOSE_CSP = STRICT_CSP.replace("script-src 'self' ", "script-src 'self' 'unsafe-inline' ").replace(
    "style-src 'self';", "style-src 'self' 'unsafe-inline';"
)

def build(csp: str) -> str:
    html = SRC.read_text()
    html = re.sub(r'<style>.*?</style>', '<link rel="stylesheet" href="loader.css">', html, count=1, flags=re.S)
    html = re.sub(
        r'<script(?![^>]*\bsrc=)[^>]*>.*?</script>',
        '<script defer src="loader.js"></script>',
        html, count=1, flags=re.S,
    )
    html = html.replace('<script src="update-auth.js?v=15"></script>',
                        '<script defer src="update-auth.js?v=15"></script>', 1)
    html = re.sub(r'(Content-Security-Policy" content=")[^"]*(")', lambda m: m.group(1) + csp + m.group(2), html, count=1)
    return html

if __name__ == "__main__":
    csp = LOOSE_CSP if "--keep-inline-csp" in sys.argv else STRICT_CSP
    out = build(csp)
    (ROOT / "index.html").write_text(out)
    (ROOT / "404.html").write_text(out)
    print("csp:", "loose" if "--keep-inline-csp" in sys.argv else "strict", "bytes:", len(out))
