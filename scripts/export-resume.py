#!/usr/bin/env python3
"""Export the canonical HTML resume as a tagged US Letter PDF."""

from pathlib import Path
import re
import subprocess
import sys
import tempfile
import time

import uno
from com.sun.star.beans import PropertyValue


def prop(name, value):
    item = PropertyValue()
    item.Name = name
    item.Value = value
    return item


root = Path(__file__).resolve().parent.parent
canonical_source = root / "docs" / "resume.html"

VARIANTS = (
    {
        "destination": "Timothy-Cisneros-Resume.pdf",
    },
    {
        "destination": "Timothy-Cisneros-Resume-Full-Stack.pdf",
        "headline": "Full-Stack Software Developer | TypeScript, React, Node.js &amp; AWS",
        "summary": "Full-stack software developer with professional experience owning AWS-backed applications from interface and API design through data, infrastructure, CI/CD, and maintenance. Builds operational software with TypeScript, React, Next.js, Vue.js, Node.js, SQL, and AWS, backed by public case studies and automated verification.",
        "projects": (
            '<p class="project"><strong>DSDebug</strong> — Next.js and React Flow developer tool that converts dense DocuSign CLM exports into interactive graphs, reducing variable tracing from an afternoon of JSON inspection to minutes.</p>'
            '<p class="project"><strong>Self-Hosted YouTube Frontend</strong> — TypeScript/Express server and browser JavaScript playback engine covering media proxying, portable storage, Redis/BullMQ workers, and 100 integration, resilience, and evaluation tests.</p>'
            '<p class="project"><strong>Action Plan Generator</strong> — TypeScript, Astro, and Vue.js application that turns a YouTube video into a constrained seven-day execution plan through structured OpenAI API output.</p>'
        ),
    },
    {
        "destination": "Timothy-Cisneros-Resume-Applied-AI.pdf",
        "headline": "Full-Stack Software Developer | Applied AI &amp; Auditable Automation",
        "summary": "Full-stack software developer implementing AI-assisted and automated workflows with explicit constraints, inspectable evidence, evaluation harnesses, and human verification. Combines TypeScript, Node.js, React, Vue.js, SQL, and AWS application delivery with professional experience in operational automation and internal tools.",
        "projects": (
            '<p class="project"><strong>Ticket System</strong> — Fastify reference implementation for auditable agent execution with durable runs, scoped authority, evidence ledgers, triage, replay, benchmark harnesses, and verification gates.</p>'
            '<p class="project"><strong>Action Plan Generator</strong> — TypeScript, Astro, and Vue.js product that transforms video content into a fixed, structured seven-day plan through the OpenAI API.</p>'
            '<p class="project"><strong>Self-Hosted YouTube Frontend</strong> — TypeScript/Express server and browser JavaScript playback engine with a recommendation evaluation harness, portable infrastructure, and 100 integration, resilience, and evaluation tests.</p>'
        ),
    },
)


def replace_variant(source, name, content):
    pattern = rf"<!-- variant:{name}:start -->.*?<!-- variant:{name}:end -->"
    replacement = f"<!-- variant:{name}:start -->{content}<!-- variant:{name}:end -->"
    rendered, count = re.subn(pattern, replacement, source, flags=re.DOTALL)
    if count != 1:
        raise RuntimeError(f"Expected one {name} variant marker, found {count}")
    return rendered


def render_variant(canonical, variant):
    rendered = canonical
    for field in ("headline", "summary", "projects"):
        if field not in variant:
            continue
        content = variant[field]
        if field in ("headline", "summary"):
            content = f'<p class="{field}">{content}</p>' if field == "headline" else f"<p>{content}</p>"
        rendered = replace_variant(rendered, field, content)
    return rendered

def export_resume(source, destination):
    with tempfile.TemporaryDirectory(prefix="portfolio-resume-") as profile:
        subprocess.run(
            [
                "libreoffice",
                f"-env:UserInstallation=file://{profile}",
                "--headless",
                "--convert-to",
                "odt:writer8",
                "--outdir",
                profile,
                str(source),
            ],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        imported_source = Path(profile) / "resume.odt"

        process = subprocess.Popen(
            [
                "libreoffice",
                f"-env:UserInstallation=file://{profile}",
                "--headless",
                "--accept=socket,host=127.0.0.1,port=2083;urp;StarOffice.ComponentContext",
                "--norestore",
                "--nodefault",
            ],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )

        try:
            local_context = uno.getComponentContext()
            resolver = local_context.ServiceManager.createInstanceWithContext(
                "com.sun.star.bridge.UnoUrlResolver", local_context
            )
            for attempt in range(50):
                try:
                    context = resolver.resolve(
                        "uno:socket,host=127.0.0.1,port=2083;urp;StarOffice.ComponentContext"
                    )
                    break
                except Exception:
                    if attempt == 49:
                        raise
                    time.sleep(0.1)

            service_manager = context.ServiceManager
            desktop = service_manager.createInstanceWithContext(
                "com.sun.star.frame.Desktop", context
            )
            document = desktop.loadComponentFromURL(
                imported_source.as_uri(),
                "_blank",
                0,
                (prop("Hidden", True),),
            )
            if document is None:
                raise RuntimeError(f"LibreOffice could not load {imported_source}")

            page_styles = document.StyleFamilies.getByName("PageStyles")
            style_names = page_styles.getElementNames()
            for style_name in style_names:
                page_style = page_styles.getByName(style_name)
                page_style.IsLandscape = False
                page_style.Width = 21590
                page_style.Height = 27940
                page_style.LeftMargin = 1473
                page_style.RightMargin = 1473
                page_style.TopMargin = 1219
                page_style.BottomMargin = 1219

            document.storeToURL(
                destination.as_uri(),
                (
                    prop("FilterName", "writer_pdf_Export"),
                    prop(
                        "FilterData",
                        (
                            prop("UseTaggedPDF", True),
                            prop("ExportBookmarks", True),
                        ),
                    ),
                ),
            )
            document.close(True)
        except Exception as error:
            print(f"Resume export failed: {error}", file=sys.stderr)
            raise
        finally:
            process.terminate()
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()


canonical = canonical_source.read_text(encoding="utf-8")
for index, variant in enumerate(VARIANTS):
    destination = root / "public" / variant["destination"]
    if index == 0:
        source = canonical_source
        export_resume(source, destination)
        continue

    with tempfile.TemporaryDirectory(prefix="portfolio-resume-source-") as source_dir:
        source = Path(source_dir) / "resume.html"
        source.write_text(render_variant(canonical, variant), encoding="utf-8")
        export_resume(source, destination)
