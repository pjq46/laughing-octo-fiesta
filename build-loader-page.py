#!/usr/bin/env python3
"""构建拆分后的 index.html / 404.html（自包含，不依赖任何 baseline HTML）。

用法：
  python3 build-loader-page.py                 # 写入 index.html 与 404.html
  python3 build-loader-page.py --check         # 只比对，不写文件（CI 用）
  python3 build-loader-page.py --out-dir DIR   # 输出到指定目录
  python3 build-loader-page.py --strict-csp    # 实验用严格 CSP（游戏会失去样式！）

动态字段默认取自同目录 game-version.json（sha256 / size / file），
可用 --sha256 / --size / --file / --repo / --ref / --title / --subtitle 覆盖。
"""
from pathlib import Path
import argparse, json, sys

ROOT = Path(__file__).resolve().parent

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
# 游戏通过 iframe srcdoc 注入，srcdoc 文档继承父页面 CSP；游戏自带内联脚本与样式，
# 因此默认必须保留 'unsafe-inline'。见 README-加载器优化说明.txt。
LOOSE_CSP = STRICT_CSP.replace("script-src 'self' ", "script-src 'self' 'unsafe-inline' ").replace(
    "style-src 'self';", "style-src 'self' 'unsafe-inline';"
)

PAGE_TEMPLATE = """<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta http-equiv="Content-Security-Policy" content="{{CSP}}"><meta name="referrer" content="no-referrer"><meta name="theme-color" content="#05070c"><link rel="preconnect" href="https://gcore.jsdelivr.net" crossorigin><link rel="preconnect" href="https://fastly.jsdelivr.net" crossorigin><link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin><link rel="preconnect" href="https://raw.githubusercontent.com" crossorigin><link rel="dns-prefetch" href="https://data.jsdelivr.com"><meta name="game-repo" content="{{REPO}}"><meta name="game-file" content="game.html"><meta name="game-sha256" content="{{SHA256}}"><meta name="game-size" content="{{SIZE}}"><meta name="game-subtitle" content="{{SUBTITLE}}"><title>{{TITLE}}</title><link rel="stylesheet" href="loader.css"><script defer src="https://913ban.cc.cd/umami/script.js" data-website-id="1ad5a3aa-2f23-4c0e-bfd9-22e06cd3de28" data-host-url="https://913ban.cc.cd/umami"></script></head><body><div class="wrap"><div class="logo" id="logo"></div><div class="sub" id="sub"></div><div class="bar" role="progressbar" aria-label="游戏下载进度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div class="fill" id="fill"></div></div><div class="meta"><em id="pct">0%</em> · <span id="size">0.0 / – MB</span> · <span id="speed">–</span></div><div class="tip" id="tip" role="status" aria-live="polite">正在连接加速线路…</div><div class="err" id="err" role="alert" aria-live="assertive"></div><button class="retry" id="retry" type="button">重试</button> <button class="ghost" id="diagBtn" type="button">导出诊断</button><div class="tools"><button class="ghost" id="saveBtn" type="button">存档管理</button></div></div><div id="savePanel" class="panel" hidden role="dialog" aria-label="存档管理"><div class="panel-box"><div class="panel-title">存档管理</div><div id="saveList" class="save-list"></div><div id="saveMsg" class="save-msg" role="status"></div><div class="panel-actions"><button id="saveExport" type="button">导出全部</button> <button id="saveImport" type="button">导入</button> <button id="saveRestore" type="button">恢复备份</button> <button id="saveClose" type="button" class="ghost">关闭</button></div><input id="saveFile" type="file" accept=".json,application/json" hidden></div></div><div id="updBar" class="upd" hidden><span id="updText"></span> <button id="updYes" type="button" disabled>更新</button> <button id="updNo" type="button" class="ghost">忽略</button></div><button id="saveHandle" type="button" aria-label="存档管理" title="存档管理">存</button><iframe id="stage" title="游戏" referrerpolicy="no-referrer" allow="fullscreen; gamepad; autoplay" allowfullscreen></iframe><script defer src="loader.js"></script><script defer src="update-auth.js?v=15"></script></body></html>"""


def load_defaults():
    manifest_path = ROOT / "game-version.json"
    data = {}
    if manifest_path.exists():
        try:
            data = json.loads(manifest_path.read_text())
        except Exception as exc:  # 清单损坏时给出可读错误
            sys.exit(f"game-version.json 无法解析：{exc}")
    return data


def build(csp, repo, sha256, size, title, subtitle):
    return (
        PAGE_TEMPLATE.replace("{{CSP}}", csp)
        .replace("{{REPO}}", repo)
        .replace("{{SHA256}}", sha256)
        .replace("{{SIZE}}", str(size))
        .replace("{{TITLE}}", title)
        .replace("{{SUBTITLE}}", subtitle)
    )


def main():
    ap = argparse.ArgumentParser(description="生成拆分后的入口页")
    ap.add_argument("--check", action="store_true", help="只校验当前 index.html/404.html 是否与模板一致")
    ap.add_argument("--out-dir", default="", help="输出目录，默认写回仓库根")
    ap.add_argument("--strict-csp", action="store_true", help="实验用：去掉 unsafe-inline（游戏样式会被拦）")
    ap.add_argument("--repo", default="pjq46/laughing-octo-fiesta")
    ap.add_argument("--ref", default="main")
    ap.add_argument("--file", default="")
    ap.add_argument("--sha256", default="")
    ap.add_argument("--size", type=int, default=0)
    ap.add_argument("--title", default="唐熙九九")
    ap.add_argument("--subtitle", default="913 校园小剧场")
    args = ap.parse_args()

    manifest = load_defaults()
    file = args.file or manifest.get("file") or "game.html"
    sha256 = args.sha256 or manifest.get("sha256") or ""
    size = args.size or int(manifest.get("size") or 0)
    if not sha256 or not size:
        sys.exit("缺少游戏哈希/体积：请先运行 gen-game-version.mjs 或传 --sha256/--size")

    csp = STRICT_CSP if args.strict_csp else LOOSE_CSP
    if args.strict_csp:
        print("警告：严格 CSP 不含 'unsafe-inline'，srcdoc 注入的游戏将丢失内联样式", file=sys.stderr)

    html = build(csp, f"{args.repo}@{args.ref}", sha256, size, args.title, args.subtitle)
    targets = [Path(args.out_dir) / n if args.out_dir else ROOT / n for n in ("index.html", "404.html")]

    if args.check:
        bad = [str(p) for p in targets if not p.exists() or p.read_text() != html]
        if bad:
            print("页面与模板不一致：" + "、".join(bad))
            print("请重新运行 python3 build-loader-page.py 生成页面")
            return 1
        print(f"页面与模板一致：{len(html)} 字节")
        return 0

    for p in targets:
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(html)
    print(f"csp: {'strict' if args.strict_csp else 'loose'}  bytes: {len(html)}  -> {', '.join(str(t) for t in targets)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
