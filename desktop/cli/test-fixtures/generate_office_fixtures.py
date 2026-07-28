#!/usr/bin/env python3
"""
生成 desktop/cli/test-fixtures/ 的最小 Office / PDF 固定样例。

用途：
- 补齐 Gate D / E / F 外部批次需要的 docx / xlsx / pptx / pdf 对象；
- 让 CLI / 桌面 / 同步链路在没有真实业务文件时也有一套可复用的最小样例；
- 生成 SHA256SUMS，方便后续跨端和发布验收记录引用。

依赖：
- python-docx
- openpyxl
- python-pptx
- reportlab

这些库不属于产品运行时依赖，只用于重建测试样例。
"""

from __future__ import annotations

from hashlib import sha256
from pathlib import Path

from docx import Document
from openpyxl import Workbook
from pptx import Presentation
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parent


def build_docx(target: Path) -> None:
    doc = Document()
    doc.core_properties.title = "Molan CLI Sample"
    doc.add_heading("Molan CLI Sample", level=1)
    doc.add_paragraph("This DOCX fixture is used for desktop/cli conversion checks.")
    p = doc.add_paragraph()
    p.add_run("Bold text. ").bold = True
    p.add_run("Italic text.").italic = True
    doc.add_paragraph("Collect file from phone")
    doc.add_paragraph("Convert to Markdown for AI", style="List Bullet")
    doc.add_paragraph("Keep source and result linked", style="List Bullet")
    doc.save(target)


def build_xlsx(target: Path) -> None:
    wb = Workbook()
    ws = wb.active
    ws.title = "summary"
    ws.append(["item", "value", "status"])
    ws.append(["documents", 12, "ready"])
    ws.append(["results", 4, "pending"])
    ws.append(["conflicts", 1, "review"])
    wb.save(target)


def build_pptx(target: Path) -> None:
    prs = Presentation()
    title_slide = prs.slides.add_slide(prs.slide_layouts[0])
    title_slide.shapes.title.text = "Molan Sample Deck"
    title_slide.placeholders[1].text = "Minimal PPTX fixture for validation"

    bullet_slide = prs.slides.add_slide(prs.slide_layouts[1])
    bullet_slide.shapes.title.text = "Pipeline"
    text_frame = bullet_slide.placeholders[1].text_frame
    text_frame.text = "Receive files"
    for line in [
        "Sync selected content",
        "Convert to Markdown",
        "Read by AI / Agent",
    ]:
        paragraph = text_frame.add_paragraph()
        paragraph.text = line
        paragraph.level = 1
    prs.save(target)


def build_pdf(target: Path) -> None:
    c = canvas.Canvas(str(target), pagesize=A4)
    width, height = A4
    y = height - 72
    c.setFont("Helvetica-Bold", 18)
    c.drawString(72, y, "Molan PDF Sample")
    y -= 30
    c.setFont("Helvetica", 11)
    for line in [
        "Minimal PDF fixture for sync / conversion / AI-read validation.",
        "1. Keep original object and derived artifact separate.",
        "2. Do not auto-upload on open.",
        "3. Require explicit AI read authorization.",
    ]:
        c.drawString(72, y, line)
        y -= 20
    c.showPage()
    c.save()


def write_sha256sums(paths: list[Path], target: Path) -> None:
    lines: list[str] = []
    for path in sorted(paths):
        digest = sha256(path.read_bytes()).hexdigest()
        lines.append(f"{digest}  {path.name}")
    target.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    outputs = {
        "sample.docx": build_docx,
        "sample.xlsx": build_xlsx,
        "sample.pptx": build_pptx,
        "sample.pdf": build_pdf,
    }
    created: list[Path] = []
    for name, builder in outputs.items():
        target = ROOT / name
        builder(target)
        created.append(target)
    write_sha256sums(created, ROOT / "SHA256SUMS")
    for path in created:
        print(f"generated {path.name} ({path.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
