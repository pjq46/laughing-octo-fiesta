#!/usr/bin/env python3
"""游戏发布脚本：自动计算 SHA-256、解析最新 commit、写回 index.html 的 meta，并可选预热 CDN。

用法（与 index.html 放在同一目录）：
  python3 update-game.py                 # 拉取仓库 main 的最新 game.html 并更新配置
  python3 update-game.py --game 本地路径  # 使用本地 game.html 计算哈希（commit 取该文件的最新提交）
  python3 update-game.py --warmup        # 更新后预热各 CDN 线路
  python3 update-game.py --no-pin        # 改为 @main 并清空哈希（自动跟随，关闭校验）

仅依赖 Python 标准库。
"""
import argparse
import hashlib
import json
import re
import sys
import urllib.request
from pathlib import Path
from urllib.parse import quote

UA = {"User-Agent": "game-loader-publish/1.0", "Accept": "application/vnd.github+json"}


def http_get(url, timeout=60, headers=None):
    req = urllib.request.Request(url, headers=headers or UA)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read()


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--game", help="本地 game.html 路径；缺省从远端 main 拉取")
    ap.add_argument("--index", default=str(Path(__file__).resolve().parent / "index.html"))
    ap.add_argument("--warmup", action="store_true", help="更新后预热 CDN")
    ap.add_argument("--no-pin", action="store_true", help="改回 @main 并清空哈希")
    args = ap.parse_args()

    index_path = Path(args.index)
    html = index_path.read_text(encoding="utf-8")

    m = re.search(r'<meta name="game-repo" content="([^"@]+)/([^"@]+)@([^"]+)"', html)
    if not m:
        sys.exit("错误：index.html 中未找到 game-repo 配置")
    owner, repo, _old_ref = m.group(1), m.group(2), m.group(3)
    fm = re.search(r'<meta name="game-file" content="([^"]+)"', html)
    game_file = fm.group(1) if fm else "game.html"

    if args.no_pin:
        new_ref, digest = "main", ""
        print("已切换为 @main 自动跟随模式（关闭 SHA-256 校验）")
    else:
        print(f"获取 {owner}/{repo} 中 {game_file} 的最新 commit …")
        try:
            data = json.loads(http_get(
                f"https://api.github.com/repos/{owner}/{repo}/commits?path={quote(game_file, safe='/')}&per_page=1",
                timeout=30))
            new_ref = data[0]["sha"]
        except Exception:
            # 兼容空仓库或路径查询异常：退回分支最新 commit。
            data = json.loads(http_get(f"https://api.github.com/repos/{owner}/{repo}/commits/main", timeout=30))
            new_ref = data["sha"]
        if args.game:
            content = Path(args.game).read_bytes()
            print(f"使用本地文件：{args.game}")
        else:
            print("拉取远端 main 的 game 文件 …")
            content = http_get(f"https://raw.githubusercontent.com/{owner}/{repo}/main/{game_file}", timeout=120)
        if b"<html" not in content[:2048].lower():
            sys.exit("错误：目标文件看起来不是 HTML，已中止")
        digest = hashlib.sha256(content).hexdigest()
        print(f"commit : {new_ref}\nsha256 : {digest}\nsize   : {len(content):,} bytes")

    html, n1 = re.subn(
        r'(<meta name="game-repo" content="[^"@]+/[^"@]+@)[^"]+(")',
        lambda mm: mm.group(1) + new_ref + mm.group(2), html, count=1)
    html, n2 = re.subn(
        r'(<meta name="game-sha256" content=")[^"]*(")',
        lambda mm: mm.group(1) + digest + mm.group(2), html, count=1)
    if n1 != 1 or n2 != 1:
        sys.exit("错误：meta 替换失败，请检查 index.html 配置行")
    index_path.write_text(html, encoding="utf-8")
    print(f"已更新 {index_path.name}，请重新部署该文件。")

    if args.warmup and not args.no_pin:
        slug = f"{owner}/{repo}@{new_ref}/{game_file}"
        for host in ("gcore.jsdelivr.net", "fastly.jsdelivr.net", "cdn.jsdelivr.net"):
            url = f"https://{host}/gh/{slug}"
            try:
                http_get(url, timeout=120, headers={**UA, "Range": "bytes=0-1023"})
                print(f"预热成功：{host}")
            except Exception as exc:  # noqa: BLE001
                print(f"预热失败（不影响发布）：{host} -> {exc}")


if __name__ == "__main__":
    main()