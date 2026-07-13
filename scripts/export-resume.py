#!/usr/bin/env python3
"""Export the canonical HTML resume as a tagged US Letter PDF."""

from pathlib import Path
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
source = root / "docs" / "resume.html"
destination = root / "public" / "Timothy-Cisneros-Resume.pdf"

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
