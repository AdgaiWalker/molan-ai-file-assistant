# mdconvert.py —— md ↔ word 命令行/拖拽转换器（独立可执行版）
#
# 这是早期原型：双击或拖拽 .md/.docx 到本脚本打包出的 exe 即可转换。
# 桌面版（desktop/，Electron + pandoc）是其 GUI 继任者，功能更完整。
# 两者均调用 pandoc 完成实际转换，转换参数一致。
import sys
import os
import pypandoc


def convert(path):
    ext = os.path.splitext(path)[1].lower()
    if ext == ".md":
        out = os.path.splitext(path)[0] + ".docx"
        fmt_in, fmt_out = "markdown", "docx"
    elif ext == ".docx":
        out = os.path.splitext(path)[0] + ".md"
        fmt_in, fmt_out = "docx", "gfm"
    else:
        print(f"  [跳过] 不支持的格式: {path}")
        return False

    if not os.path.exists(path):
        print(f"  [错误] 文件不存在: {path}")
        return False

    # 不覆盖已有文件:同名时加 _1 _2 序号
    if os.path.exists(out):
        base, e = os.path.splitext(out)
        i = 1
        while os.path.exists(f"{base}_{i}{e}"):
            i += 1
        out = f"{base}_{i}{e}"

    try:
        pypandoc.convert_file(path, fmt_out, format=fmt_in, outputfile=out)
        print(f"  [OK] {os.path.basename(path)}  ->  {os.path.basename(out)}")
        return True
    except Exception as e:
        print(f"  [失败] {os.path.basename(path)}: {e}")
        return False


def wait_if_interactive():
    # 双击/拖拽运行时 isatty=True,等回车让用户看结果
    # 被命令行调用时 stdin 是 EOF,input 立即返回不崩
    if sys.stdin.isatty():
        try:
            input("\n按回车退出...")
        except EOFError:
            pass


def main():
    args = sys.argv[1:]

    if not args:
        print("=== md <-> word 转换器 ===")
        print("用法:把 .md 或 .docx 文件拖到本程序图标上")
        print("或命令行: mdconvert 文件1 文件2 ...")
        wait_if_interactive()
        return

    print(f"开始转换 {len(args)} 个文件:")
    ok = 0
    for p in args:
        # 拖拽时 Windows 传参可能带引号,去掉
        p = p.strip().strip('"').strip("'")
        if convert(p):
            ok += 1
    print(f"\n完成: {ok}/{len(args)} 成功")
    wait_if_interactive()


if __name__ == "__main__":
    main()
