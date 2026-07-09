import argparse
import hashlib
import os
import sys
import urllib.request
import zipfile

DEFAULT_OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "desktop", "resources")
DEFAULT_VERSION = "3.10"

# 官方 SHA256（来源：GitHub Release API https://api.github.com/repos/jgm/pandoc/releases/tags/<version>，
# asset digest 字段）。校验失败脚本直接退出非 0，避免下载到被篡改/不完整的 pandoc。
EXPECTED_SHA256 = {
    "3.10": "bb808d00fd58762299d64582a9b4c3e4b106cd929e62c5f19bcdcb496f1e54ae",
}


def build_mirrors(version):
    filename = f"pandoc-{version}-windows-x86_64.zip"
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
    parser = argparse.ArgumentParser(description="下载并校验 pandoc Windows 版")
    parser.add_argument("--out", default=DEFAULT_OUT, help="输出目录（默认 %(default)s）")
    parser.add_argument("--pandoc-version", default=DEFAULT_VERSION, help="pandoc 版本号（默认 %(default)s）")
    args = parser.parse_args()

    out_dir = args.out
    version = args.pandoc_version
    os.makedirs(out_dir, exist_ok=True)
    dst_zip = os.path.join(out_dir, "pandoc.zip")
    dst_dir = os.path.join(out_dir, "pandoc")

    ok = False
    for url in build_mirrors(version):
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

    expected = EXPECTED_SHA256.get(version, "")
    if not expected:
        # 未锁版本的 SHA256 视为不安全：拒绝继续，强制先登记官方哈希
        print(f"未配置 pandoc {version} 的预期 SHA256。请先到 https://api.github.com/repos/jgm/pandoc/releases/tags/{version} 取 windows-x86_64.zip 的 digest，填入 EXPECTED_SHA256 后重试。")
        sys.exit(1)
    actual = sha256_of(dst_zip)
    if actual.lower() != expected.lower():
        print(f"SHA256 校验失败\n  预期: {expected}\n  实际: {actual}")
        sys.exit(1)
    print(f"SHA256 校验通过: {actual}")

    print("解压...")
    with zipfile.ZipFile(dst_zip) as z:
        z.extractall(dst_dir)
    print("解压完成")

    found = None
    for root, dirs, files in os.walk(dst_dir):
        for f in files:
            if f.lower() == "pandoc.exe":
                found = os.path.join(root, f)
                print("pandoc.exe 位置:", found)
    if not found:
        print("未找到 pandoc.exe")
        sys.exit(1)


if __name__ == "__main__":
    main()
