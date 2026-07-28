#!/usr/bin/env python3

import argparse
import hashlib
import os
import platform
import shutil
import sys
import urllib.request
import zipfile
from dataclasses import dataclass

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_OUT = os.path.join(REPO_ROOT, "desktop", "resources")
DEFAULT_VERSION = "3.10"


@dataclass(frozen=True)
class Release:
    filename: str
    binary_name: str
    sha256: str


# 官方 SHA256 来自 GitHub Release 资产的 digest 字段。校验失败直接退出，
# 避免把被篡改或下载不完整的二进制打进桌面应用。
RELEASES = {
    ("3.10", "darwin", "arm64"): Release(
        filename="pandoc-3.10-arm64-macOS.zip",
        binary_name="pandoc",
        sha256="d9cad01d96ae774a0dc8c8c45bb1ad3e4c5ff2cc2e24f45958f5f9b7974aee34",
    ),
    ("3.10", "darwin", "x86_64"): Release(
        filename="pandoc-3.10-x86_64-macOS.zip",
        binary_name="pandoc",
        sha256="6334f4d9af7c9e37e761dfad56fa5507685f6d29724ebf31c4be6d5c654a3161",
    ),
    ("3.10", "windows", "amd64"): Release(
        filename="pandoc-3.10-windows-x86_64.zip",
        binary_name="pandoc.exe",
        sha256="bb808d00fd58762299d64582a9b4c3e4b106cd929e62c5f19bcdcb496f1e54ae",
    ),
}


def resolve_release(version, system_name=None, machine=None):
    key = (
        version,
        (system_name or platform.system()).lower(),
        (machine or platform.machine()).lower(),
    )
    release = RELEASES.get(key)
    if release is None:
        raise ValueError(
            f"不支持的平台或版本: system={key[1]}, arch={key[2]}, pandoc={version}"
        )
    return release


def build_mirrors(version, filename):
    return [
        f"https://kkgithub.com/jgm/pandoc/releases/download/{version}/{filename}",
        f"https://ghproxy.net/https://github.com/jgm/pandoc/releases/download/{version}/{filename}",
        f"https://github.com/jgm/pandoc/releases/download/{version}/{filename}",
    ]


def download(url, dst_zip):
    print(f"尝试: {url}")
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=60) as r, open(dst_zip, "wb") as f:
        total = int(r.headers.get("Content-Length", 0))
        done = 0
        while True:
            chunk = r.read(1 << 16)
            if not chunk:
                break
            f.write(chunk)
            done += len(chunk)
            if total:
                print(f"\r  {done}/{total} 字节 ({done*100//total}%)", end="", flush=True)
        print()
    size = os.path.getsize(dst_zip)
    print(f"  下载完成: {size:,} 字节")
    return size


def sha256_of(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while True:
            chunk = f.read(1 << 16)
            if not chunk:
                break
            h.update(chunk)
    return h.hexdigest()


def main():
    parser = argparse.ArgumentParser(description="下载并校验当前桌面平台的 pandoc")
    parser.add_argument("--out", default=DEFAULT_OUT, help="输出目录（默认 %(default)s）")
    parser.add_argument("--pandoc-version", default=DEFAULT_VERSION, help="pandoc 版本号（默认 %(default)s）")
    args = parser.parse_args()

    out_dir = args.out
    version = args.pandoc_version
    try:
        release = resolve_release(version)
    except ValueError as error:
        print(error)
        sys.exit(1)

    os.makedirs(out_dir, exist_ok=True)
    dst_zip = os.path.join(out_dir, "pandoc.zip")
    dst_dir = os.path.join(out_dir, "pandoc-extracted")

    ok = False
    for url in build_mirrors(version, release.filename):
        try:
            size = download(url, dst_zip)
            if size < 1_000_000:
                print("  体积异常小,可能不是真文件,跳过")
                continue
            ok = True
            break
        except Exception as e:
            print(f"  失败: {e}")

    if not ok:
        print("所有镜像都失败")
        sys.exit(1)

    actual = sha256_of(dst_zip)
    if actual.lower() != release.sha256.lower():
        print(f"SHA256 校验失败\n  预期: {release.sha256}\n  实际: {actual}")
        sys.exit(1)
    print(f"SHA256 校验通过: {actual}")

    print("解压...")
    shutil.rmtree(dst_dir, ignore_errors=True)
    with zipfile.ZipFile(dst_zip) as z:
        z.extractall(dst_dir)
    print("解压完成")

    found = None
    for root, dirs, files in os.walk(dst_dir):
        for f in files:
            if f == release.binary_name:
                found = os.path.join(root, f)
                print("pandoc 位置:", found)
    if not found:
        print(f"未找到 {release.binary_name}")
        sys.exit(1)

    final_binary = os.path.join(out_dir, release.binary_name)
    shutil.copy2(found, final_binary)
    if release.binary_name == "pandoc":
        os.chmod(final_binary, 0o755)
    print("已复制到:", final_binary)


if __name__ == "__main__":
    main()
