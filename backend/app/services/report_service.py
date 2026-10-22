import csv, io

def safe(v):
    """Neutralise spreadsheet formula injection and convert to uppercase."""
    s = "" if v is None else str(v).upper()
    return "'" + s if s[:1] in ("=", "+", "-", "@", "\t", "\r") else s

def make_csv(name, cols, rows) -> bytes:
    buf = io.StringIO()
    w = csv.writer(buf)
    # Title and Column Headers in ALL CAPS
    w.writerow([f"{name.upper()} REPORT"])
    w.writerow([c.upper() for c in cols])
    # Row values in ALL CAPS
    for r in rows:
        w.writerow([safe(v) for v in r])
    return ("\ufeff" + buf.getvalue()).encode("utf-8")

def make_pdf(name, cols, rows) -> bytes:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
    
    buf = io.BytesIO()
    st = getSampleStyleSheet()
    
    doc = SimpleDocTemplate(
        buf,
        pagesize=landscape(A4),
        leftMargin=30,
        rightMargin=30,
        topMargin=30,
        bottomMargin=30
    )
    
    # Convert all column names and table row data to ALL CAPS
    data = [[c.upper() for c in cols]] + [["" if v is None else str(v).upper()[:60] for v in r] for r in rows]
    
    t = Table(data, repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e293b")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("GRID", (0, 0), (-1, -1), 0.25, colors.grey),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f1f5f9")])
    ]))
    
    # Title in ALL CAPS with no date line or page numbers
    doc.build([
        Paragraph(f"{name.upper()} REPORT", st["Title"]),
        Spacer(1, 10),
        t
    ])
    return buf.getvalue()