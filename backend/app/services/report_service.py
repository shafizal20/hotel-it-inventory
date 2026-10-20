import csv, io
from datetime import datetime

def safe(v):
    """Neutralise spreadsheet formula injection."""
    s = "" if v is None else str(v)
    return "'" + s if s[:1] in ("=", "+", "-", "@", "\t", "\r") else s

def make_csv(name, cols, rows) -> bytes:
    buf = io.StringIO(); w = csv.writer(buf)
    w.writerow([f"{name} report", f"generated {datetime.now():%Y-%m-%d %H:%M}"]); w.writerow(cols)
    for r in rows:
        w.writerow([safe(v) for v in r])
    return ("\ufeff" + buf.getvalue()).encode("utf-8")

def make_pdf(name, cols, rows) -> bytes:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
    buf = io.BytesIO(); st = getSampleStyleSheet()
    def footer(c, d):
        c.setFont("Helvetica", 8); c.drawRightString(landscape(A4)[0] - 30, 18, f"Page {d.page}")
    doc = SimpleDocTemplate(buf, pagesize=landscape(A4), leftMargin=30, rightMargin=30, topMargin=30, bottomMargin=36)
    data = [[c.upper() for c in cols]] + [["" if v is None else str(v)[:60] for v in r] for r in rows]
    t = Table(data, repeatRows=1)
    t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e293b")), ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTSIZE", (0, 0), (-1, -1), 8), ("GRID", (0, 0), (-1, -1), 0.25, colors.grey),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f1f5f9")])]))
    doc.build([Paragraph(f"{name} report", st["Title"]), Paragraph(f"Generated {datetime.now():%Y-%m-%d %H:%M} - {len(rows)} records", st["Normal"]), Spacer(1, 10), t],
              onFirstPage=footer, onLaterPages=footer)
    return buf.getvalue()
