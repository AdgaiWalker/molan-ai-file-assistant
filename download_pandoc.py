import urllib.request
import zipfile
import os
import sys

mirrors = [
    "https://kkgithub.com/jgm/pandoc/releases/download/3.10/pandoc-3.10-windows-x86_64.zip",
    "https://ghproxy.net/https://github.com/jgm/pandoc/releases/download/3.10/pandoc-3.10-windows-x86_64.zip",
    "https://github.com/jgm/pandoc/releases/download/3.10/pandoc-3.10-windows-x86_64.zip",
]
dst_zip = r"C:\Users\26296\Desktop\新建文件夹 (6)\pandoc.zip"
dst_dir = r"C:\Users\26296\Desktop\新建文件夹 (6)\pandoc"

ok = False
for url in mirrors:
    print(f"尝试: {url}")
    try:
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
