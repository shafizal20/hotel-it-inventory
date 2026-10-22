
import csv
import io


def safe(v):
    """Neutralise spreadsheet formula injection and convert to uppercase."""
    s = "" if v is None else str(v).upper()
    return "'" + s if s[:1] in ("=", "+", "-", "@", "\t", "\r") else s


def make_csv(name, cols, rows) -> bytes:
    """Generate a CSV report with uppercase titles, headers, and values."""
    buf = io.StringIO()
    w = csv.writer(buf)

    # Title and column headers in ALL CAPS
    w.writerow([f"{name.upper()} REPORT"])
    w.writerow([c.upper() for c in cols])

    # Row values in ALL CAPS
    for r in rows:
        output_row = []

        for col, v in zip(cols, r):
            # CSV cannot embed actual images; use a readable placeholder.
            if (
                col.lower() in ("pic", "picture", "image", "photo")
                and isinstance(v, (bytes, bytearray, memoryview))
            ):
                output_row.append("IMAGE AVAILABLE")
            else:
                output_row.append(safe(v))

        w.writerow(output_row)

    return ("\ufeff" + buf.getvalue()).encode("utf-8")


def make_pdf(name, cols, rows) -> bytes:
    """Generate a PDF report with embedded item photos where available."""
    from PIL import Image as PILImage
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.platypus import (
        Image as PDFImage,
        Paragraph,
        SimpleDocTemplate,
        Spacer,
        Table,
        TableStyle,
    )

    buf = io.BytesIO()
    image_buffers = []
    styles = getSampleStyleSheet()

    doc = SimpleDocTemplate(
        buf,
        pagesize=landscape(A4),
        leftMargin=30,
        rightMargin=30,
        topMargin=30,
        bottomMargin=30,
    )

    # Identify columns that may contain item photos.
    image_columns = {
        i
        for i, col in enumerate(cols)
        if col.lower().strip() in ("pic", "picture", "image", "photo")
    }

    # Table headers in ALL CAPS.
    data = [[str(col).upper() for col in cols]]

    # Convert each row, embedding valid image data into PDF cells.
    for r in rows:
        output_row = []

        for i, v in enumerate(r):
            if v is None:
                output_row.append("")
                continue

            # Handle binary image columns without converting bytes to text.
            if i in image_columns and isinstance(
                v, (bytes, bytearray, memoryview)
            ):
                try:
                    image_data = io.BytesIO(bytes(v))

                    with PILImage.open(image_data) as source_image:
                        source_image.load()
                        photo = source_image.copy()

                    # Create a thumbnail while preserving its aspect ratio.
                    photo.thumbnail((120, 90))

                    # ReportLab embeds the converted image in the PDF.
                    image_output = io.BytesIO()
                    if photo.mode not in ("RGB", "RGBA"):
                        photo = photo.convert("RGB")

                    photo.save(image_output, format="PNG")
                    image_output.seek(0)

                    # Keep buffers alive until the PDF has been generated.
                    image_buffers.append(image_output)

                    output_row.append(
                        PDFImage(
                            image_output,
                            width=80,
                            height=55,
                            kind="proportional",
                        )
                    )

                except Exception:
                    # Do not print binary image data into the PDF.
                    output_row.append("IMAGE UNAVAILABLE")

            else:
                # Normal values remain uppercase and limited in length.
                output_row.append(str(v).upper()[:60])

        data.append(output_row)

    # Build the report table.
    table = Table(data, repeatRows=1)

    table_style = [
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e293b")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("GRID", (0, 0), (-1, -1), 0.25, colors.grey),
        (
            "ROWBACKGROUNDS",
            (0, 1),
            (-1, -1),
            [colors.white, colors.HexColor("#f1f5f9")],
        ),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]

    # Center image cells.
    for i in image_columns:
        table_style.append(("ALIGN", (i, 1), (i, -1), "CENTER"))

    table.setStyle(TableStyle(table_style))

    # Title in ALL CAPS; no date line or page numbers.
    doc.build([
        Paragraph(f"{name.upper()} REPORT", styles["Title"]),
        Spacer(1, 10),
        table,
    ])

    return buf.getvalue()
