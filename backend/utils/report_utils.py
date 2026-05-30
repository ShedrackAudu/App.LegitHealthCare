"""
report_utils.py
Generates a pixel-faithful 2-page A4 clinical PDF matching the PatientReportPage UI.
Uses reportlab for precise layout control.
"""

import io
import os
import datetime
import qrcode
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    Image, HRFlowable, KeepTogether
)
from reportlab.graphics.shapes import Drawing, Rect, String
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# ── Brand Colours (matching CSS vars) ──────────────────────────────────────────
TEAL   = colors.HexColor('#00897b')
RED    = colors.HexColor('#d32f2f')
BLACK  = colors.black
GREY   = colors.HexColor('#333333')
LGREY  = colors.HexColor('#cccccc')
WHITE  = colors.white

W, H = A4  # 595.28 × 841.89 pts
PL, PR, PT, PB = 12*mm, 12*mm, 8*mm, 8*mm  # page margins


def _load_image(path_or_url: str, width_mm: float, height_mm: float):
    """Load an image from a local filesystem path, return an RL Image or None."""
    if not path_or_url:
        return None
    # Strip URL prefix if absolute path was stored as /static/...
    local_path = path_or_url
    if path_or_url.startswith('http'):
        # Images served from Flask static — map back to filesystem
        # e.g. http://localhost:5000/static/uploads/header.png
        rel = path_or_url.split('/static/')[-1]
        base = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'static')
        local_path = os.path.join(base, rel)
    elif path_or_url.startswith('/static/'):
        base = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'static')
        local_path = os.path.join(base, path_or_url[len('/static/'):])

    if os.path.exists(local_path):
        try:
            return Image(local_path, width=width_mm*mm, height=height_mm*mm)
        except Exception:
            pass
    return None


def _qr_image(url: str, size_mm: float = 20):
    """Generate a QR code and return it as a ReportLab Image."""
    if not url:
        return None
    try:
        qr = qrcode.QRCode(box_size=4, border=1)
        qr.add_data(url)
        qr.make(fit=True)
        img = qr.make_image(fill_color='black', back_color='white')
        buf = io.BytesIO()
        img.save(buf, format='PNG')
        buf.seek(0)
        return Image(buf, width=size_mm*mm, height=size_mm*mm)
    except Exception:
        return None


def _para(text, size=10, bold=False, color=BLACK, align=TA_LEFT, leading=None):
    style = ParagraphStyle(
        'custom',
        fontSize=size,
        fontName='Helvetica-Bold' if bold else 'Helvetica',
        textColor=color,
        alignment=align,
        leading=leading or size * 1.2,
        wordWrap='CJK',
    )
    return Paragraph(str(text) if text else '-', style)


def _fmt_date(dstr):
    if not dstr:
        return '-'
    try:
        d = datetime.datetime.fromisoformat(str(dstr).replace('Z', '+00:00'))
        return d.strftime('%I:%M %p - %d %B %Y')
    except Exception:
        return str(dstr)


def _fmt_section(sec):
    u = (sec or '').upper()
    if u == 'DCP': return 'PLANT'
    if u == 'DCT': return 'TRANSPORT'
    return u


def generate_patient_report_pdf(report_data: dict) -> bytes:
    """
    Given the report_data dict (same shape as the API returns), produce a
    2-page A4 PDF byte string matching the web UI report layout.
    """
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=PL, rightMargin=PR,
        topMargin=PT, bottomMargin=PB,
        title='Medical Report',
    )

    bio      = report_data.get('bio', {})
    results  = report_data.get('results', {})
    branding = report_data.get('branding', {})
    timing   = report_data.get('timing', {})
    consult  = results.get('consultation', {})
    fbc      = results.get('fbc', {})
    kft      = results.get('kft', {})
    lft      = results.get('lft', {})
    lipid    = results.get('lipid', {})
    special  = results.get('special', {})
    director = results.get('director', {})

    usable_w = W - PL - PR  # ~171 mm in points

    year    = bio.get('screening_year', '')
    section = bio.get('section', '')

    story = []

    # ══════════════════════════════════════════════════════════════
    # PAGE 1
    # ══════════════════════════════════════════════════════════════

    # 1. Header image ──────────────────────────────────────────────
    hdr_img = _load_image(branding.get('header_image'), 186, 22)
    if hdr_img:
        story.append(hdr_img)
    else:
        story.append(Table(
            [[_para('[ CLINIC HEADER IMAGE ]', 10, color=LGREY, align=TA_CENTER)]],
            colWidths=[usable_w],
            style=TableStyle([
                ('BOX', (0,0), (-1,-1), 0.5, LGREY),
                ('ROWBACKGROUNDS', (0,0), (-1,-1), [colors.HexColor('#f5f5f5')]),
                ('TOPPADDING', (0,0), (-1,-1), 8*mm),
                ('BOTTOMPADDING', (0,0), (-1,-1), 8*mm),
            ])
        ))

    story.append(Spacer(1, 2*mm))

    # 2. Report title ──────────────────────────────────────────────
    title_text = (
        f'{year} ANNUAL MEDICAL SCREENING FOR SUNU HEALTH ENROLLEES AT '
        f'DANGOTE CEMENT {_fmt_section(section)}, OBAJANA, KOGI STATE.'
    )
    title_style = ParagraphStyle(
        'title', fontSize=11, fontName='Helvetica-Bold', textColor=RED,
        alignment=TA_CENTER, leading=14, spaceAfter=2*mm
    )
    story.append(Paragraph(title_text, title_style))
    story.append(HRFlowable(width=usable_w, thickness=1, color=BLACK, spaceAfter=1*mm))

    # 3. Patient name ──────────────────────────────────────────────
    def mk_name(f, m, l, full=None):
        if full: return str(full).upper()
        parts = [f or '']
        if m: parts.append(f'{m[0]}.')
        parts.append(l or '')
        return ' '.join(p for p in parts if p).upper()

    full_name_api = bio.get('full_name')
    full_name = mk_name(bio.get('first_name',''), bio.get('middle_name',''), bio.get('last_name',''), full=full_name_api)
    name_style = ParagraphStyle('name', fontSize=13, fontName='Helvetica-Bold',
                                textColor=colors.black, leading=16, spaceAfter=1*mm)
    story.append(Paragraph(full_name, name_style))
    story.append(HRFlowable(width=usable_w, thickness=1.5, color=colors.black, spaceAfter=1*mm))

    # 4. Bio grid (3 columns) ──────────────────────────────────────
    def kv(label, val, w=55*mm):
        return Table(
            [[_para(label, 8, bold=True, color=TEAL), _para(str(val or '-'), 8)]],
            colWidths=[24*mm, w - 24*mm]
        )

    ref = f"{year}/{(section or '').upper()}/{bio.get('patient_id','')}" if bio.get('patient_id') else '-'

    col1 = [
        kv('Staff ID:', bio.get('staff_id')),
        kv('PID:', bio.get('patient_id')),
        kv('Dept:', bio.get('department')),
        kv('Sex:', bio.get('gender')),
        kv('DOB:', bio.get('dob')),
    ]
    col2 = [
        kv('Age:', bio.get('age')),
        kv('Phone:', bio.get('phone')),
        kv('Email:', bio.get('email')),
        kv('Nationality:', bio.get('nationality')),
        kv('Ref:', ref),
    ]
    col3 = [
        kv('Registered at:', _fmt_date(timing.get('reg_date_time')), w=62*mm),
        kv('Reported on:', _fmt_date(timing.get('report_date_time')), w=62*mm),
        kv('Generated on:', _fmt_date(timing.get('gen_date_time')), w=62*mm),
    ]

    def col_table(rows):
        return Table([[r] for r in rows], colWidths=[57*mm])

    bio_table = Table(
        [[col_table(col1), col_table(col2), col_table(col3)]],
        colWidths=[57*mm, 57*mm, 62*mm]
    )
    bio_table.setStyle(TableStyle([('VALIGN', (0,0), (-1,-1), 'TOP')]))
    story.append(bio_table)
    story.append(Spacer(1, 1*mm))

    # 5. Section title ─────────────────────────────────────────────
    def section_title(text):
        st = ParagraphStyle(
            'sec', fontSize=11, fontName='Helvetica-Bold', textColor=TEAL,
            alignment=TA_CENTER, leading=14
        )
        return [
            HRFlowable(width=usable_w, thickness=1.5, color=BLACK, spaceBefore=1*mm, spaceAfter=0.5*mm),
            Paragraph(text, st),
            HRFlowable(width=usable_w, thickness=1.5, color=BLACK, spaceBefore=0.5*mm, spaceAfter=1*mm),
        ]

    story.extend(section_title('LAB FINDINGS / REPORT'))

    # 6. Lab results table ─────────────────────────────────────────
    th_style = ParagraphStyle('th', fontSize=8, fontName='Helvetica-Bold',
                              textColor=BLACK, alignment=TA_LEFT)
    td_style = ParagraphStyle('td', fontSize=8, fontName='Helvetica',
                              textColor=GREY, alignment=TA_LEFT, leading=10)
    td_bold  = ParagraphStyle('tdb', fontSize=8, fontName='Helvetica-Bold',
                              textColor=BLACK, alignment=TA_LEFT, leading=10)

    def td(t, bold=False): return Paragraph(str(t or '-'), td_bold if bold else td_style)
    def th(t):             return Paragraph(t, th_style)

    # Ensure lab data exists
    fbc = fbc or {}
    kft = kft or {}
    lft = lft or {}
    lipid = lipid or {}
    consult = consult or {}

    col_ws = [35*mm, 28*mm, 20*mm, 32*mm, 18*mm, 34*mm]

    # header row
    lab_rows = [
        [th('INVESTIGATION'), th('PARAMETER'), th('RESULT'), th('REF. VALUE'), th('UNIT'), th('REMARK')],
        
        # Blood Sugar
        [td('Blood Sugar', True), td('FBS'), td(consult.get('fbs')), td('70-99'), td('ml/dL'), td(consult.get('sugar_remark'))],
        ['', td('RBS'), td(consult.get('rbs')), td('&lt;200'), td('ml/dL'), ''],
        
        # FBC
        [td('FBC', True), td('PCV'), td(fbc.get('pcv')), td('34-53.9'), td('%'), td(fbc.get('remark'))],
        ['', td('WBC'), td(fbc.get('wbc')), td('3-11'), td('x109/L'), ''],
        ['', td('Lymphocryte'), td(fbc.get('lymp_percent')), td('19.1-48'), td('%'), ''],
        ['', td('Neutrophil'), td(fbc.get('gra_percent')), td('43.6-73.3'), td('%'), ''],
        ['', td('Mixed'), td(fbc.get('mid_percent')), td('4.5-12.1'), td('%'), ''],
        ['', td('Platelets'), td(fbc.get('plt')), td('100-450'), td('x109/L'), ''],
        
        # Kidney Function
        [td('Kidney Function', True), td('Potassium'), td(kft.get('potassium')), td('3.5-5.0'), td('mmol/L'), td(kft.get('remark'))],
        ['', td('Sodium'), td(kft.get('sodium')), td('135-145'), td('mmol/L'), ''],
        ['', td('Chloride'), td(kft.get('chloride')), td('97-107'), td('mmol/L'), ''],
        ['', td('Bicarbonate'), td(kft.get('hco3')), td('20-31'), td('mmol/L'), ''],
        ['', td('Urea'), td(lft.get('urea')), td('10-50'), td('mg/dL'), ''],
        ['', td('Cretinine'), td(lft.get('creatinine')), td('Male: 0.7-1.4<br/>Female: 0.6-1.2'), td('mmol/L<br/>mmol/L'), ''],
        
        # Lipid Profile
        [td('Lipid Profile', True), td('Total Cholesterol'), td(lipid.get('tcho')), td('&lt;200'), td('mg/dL'), td(lipid.get('remark'))],
        ['', td('Trigracerides'), td(lipid.get('tg')), td('Male: 60-165<br/>Female: 42-88'), td('mg/dL<br/>mg/dL'), ''],
        ['', td('HDL-c'), td(lipid.get('hdl')), td('Male: 35-80<br/>Female: 42-88'), td('mg/dL<br/>mg/dL'), ''],
        ['', td('LDL-c'), td(lipid.get('ldl')), td('&lt;130'), td('mg/dL'), ''],
        
        # Liver Function
        [td('Liver Function', True), td('AST'), td(lft.get('ast')), td('0-46'), td('U/L'), td(lft.get('remark'))],
        ['', td('ALT'), td(lft.get('alt')), td('0-49'), td('U/L'), ''],
        ['', td('ALP'), td(lft.get('alp')), td('Male: 80-306<br/>Female: 64-306'), td('U/L<br/>U/L'), ''],
        ['', td('TB'), td(lft.get('tb')), td('0-1.2'), td('mg/dL'), ''],
        ['', td('CB'), td(lft.get('cb')), td('0-0.4'), td('mg/dL'), ''],
        
        # Urine Analysis
        [td('Urine Analysis', True), td('Sugar & Protein'), td(consult.get('ua_result')), td('NA'), td(''), td(consult.get('ua_remark'))],
        
        # PSA
        [td('PSA', True), td('PSA'), td(consult.get('psa')), td('NA'), td(''), td(consult.get('psa_remark'))]
    ]

    SPAN_DEFS = [
        # Investigation name column spans
        ('SPAN', (0,1), (0,2)),   # Blood Sugar
        ('SPAN', (0,3), (0,8)),   # FBC
        ('SPAN', (0,9), (0,14)),  # Kidney Function
        ('SPAN', (0,15), (0,18)), # Lipid Profile
        ('SPAN', (0,19), (0,23)), # Liver Function

        # Remark column spans
        ('SPAN', (5,1), (5,2)),   # Blood Sugar Remark
        ('SPAN', (5,3), (5,8)),   # FBC Remark
        ('SPAN', (5,9), (5,14)),  # Kidney Function Remark
        ('SPAN', (5,15), (5,18)), # Lipid Profile Remark
        ('SPAN', (5,19), (5,23)), # Liver Function Remark
    ]

    group_borders = [2, 8, 14, 18, 23, 24]  # rows after which a border appears

    lab_ts = TableStyle([
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-1), 8),
        ('TOPPADDING',    (0,0), (-1,-1), 1),
        ('BOTTOMPADDING', (0,0), (-1,-1), 1),
        ('LEFTPADDING',   (0,0), (-1,-1), 1),
        ('RIGHTPADDING',  (0,0), (-1,-1), 1),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('LINEBELOW', (0,0), (-1,0), 1.2, BLACK),  # header underline
        ('ROWBACKGROUNDS', (0,0), (-1,0), [colors.HexColor('#f0f0f0')]),
    ] + list(SPAN_DEFS) + [
        ('LINEBELOW', (0,r), (-1,r), 0.8, LGREY) for r in group_borders if r < len(lab_rows)
    ])

    lab_table = Table(lab_rows, colWidths=col_ws, repeatRows=1)
    lab_table.setStyle(lab_ts)
    story.append(lab_table)

    # 7. Footer (QR + sig + footer image) ─────────────────────────
    def page_footer(branding, report_data, show_end=True):
        items = []
        if show_end:
            items.append(_para('***End of Report***', 10, bold=True, align=TA_CENTER))
            items.append(Spacer(1, 2*mm))

        qr_el  = _qr_image(report_data.get('verification_url'), 20)
        sig_el = _load_image(branding.get('signature_image'), 40, 12)

        qr_box  = qr_el  or _para('[QR]', 7, color=LGREY, align=TA_CENTER)
        sig_box = sig_el or _para('[Signature]', 7, color=LGREY)

        qr_label = Table(
            [[qr_box], [_para('SCAN TO VERIFY', 6, bold=True, color=WHITE,
                               align=TA_CENTER)]],
            colWidths=[22*mm],
            style=TableStyle([
                ('BACKGROUND', (0,1), (0,1), colors.HexColor('#00c4cc')),
                ('TOPPADDING', (0,1), (0,1), 1),
                ('BOTTOMPADDING', (0,1), (0,1), 1),
            ])
        )
        sig_block = Table(
            [[sig_box],
             [_para('Dr. Anyanwu Ugochukwu D. FMCPath', 8, bold=True)],
             [_para('Consultant in Charge', 8, color=GREY)]],
            colWidths=[80*mm]
        )

        split = Table(
            [[qr_label, '', sig_block]],
            colWidths=[22*mm, 74*mm, 80*mm],
            style=TableStyle([
                ('LINEBELOW', (0,0), (-1,0), 1.2, BLACK),
                ('VALIGN', (0,0), (-1,-1), 'BOTTOM'),
                ('BOTTOMPADDING', (0,0), (-1,-1), 2),
            ])
        )
        items.append(split)
        items.append(Spacer(1, 1*mm))

        ftr_img = _load_image(branding.get('footer_image'), (usable_w/mm), 8)
        if ftr_img:
            items.append(ftr_img)
        else:
            items.append(_para('[ CLINIC FOOTER IMAGE ]', 8, color=LGREY, align=TA_CENTER))

        return items

    story.extend(page_footer(branding, report_data))

    # ══════════════════════════════════════════════════════════════
    # PAGE 2
    # ══════════════════════════════════════════════════════════════
    from reportlab.platypus import PageBreak
    story.append(PageBreak())

    # Header image again
    hdr_img2 = _load_image(branding.get('header_image'), 186, 22)
    if hdr_img2:
        story.append(hdr_img2)
    story.append(Spacer(1, 1*mm))

    # Mini ID bar
    id_bar = Table(
        [[_para(f"Staff ID: {bio.get('staff_id','')}", 10, bold=True, color=TEAL),
          _para(f"PID: {bio.get('patient_id','')}", 10, bold=True, color=TEAL)]],
        colWidths=[usable_w/2, usable_w/2]
    )
    story.append(id_bar)
    story.append(Spacer(1, 1*mm))

    story.extend(section_title('CLINICAL AND LABORATORY FINDINGS'))

    # Clinical findings table
    hx_pe_val = director.get('hx_pe') or consult.get('hx_pe')
    lab_remark_val = director.get('lab_remark') or consult.get('lab_remark')
    clin_rows = [
        [th('S/N'), th('INVESTIGATION'), th('RESULT')],
        [td('1.'), td('Relevant History and Physical Exam:'), td(hx_pe_val)],
        [td('2.'), td('Relevant Laboratory Investigations:'), td(lab_remark_val)],
        [td('3.'), td('Electrocardiogram (ECG Findings):'), td(special.get('ecg'))],
        [td('4.'), td('Spirometry (Lung Function Test):'), td(special.get('spirometry'))],
        [td('5.'), td('Audiometry (Hearing Test):'), td(special.get('audiometry'))],
        [td('6.'), td('Breast Examination (Females only):'), td(consult.get('breast'))],
    ]
    clin_ts = TableStyle([
        ('FONTSIZE', (0,0), (-1,-1), 9),
        ('TOPPADDING',    (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('LINEBELOW', (0,0), (-1,0), 1.2, BLACK),
        ('LINEBELOW', (0,1), (-1,-2), 0.5, LGREY),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ])
    clin_table = Table(clin_rows, colWidths=[12*mm, 60*mm, 114*mm])
    clin_table.setStyle(clin_ts)
    story.append(clin_table)
    story.append(Spacer(1, 1*mm))

    # Vitals
    story.extend(section_title("PATIENT'S VITAL SIGNS"))
    vitals_data = [
        [
            _para('Blood Pressure', 8, color=GREY),
            _para('Pulse Rate', 8, color=GREY),
            _para('SPO2', 8, color=GREY),
        ],
        [
            _para(str(consult.get('bp') or '-'), 11, bold=True),
            _para(str(consult.get('pulse') or '-'), 11, bold=True),
            _para(str(consult.get('spo2') or '-'), 11, bold=True),
        ],
        [
            _para('mm/hg', 7, color=GREY),
            _para('b/m', 7, color=GREY),
            _para('%', 7, color=GREY),
        ],
    ]
    vt = Table(vitals_data, colWidths=[usable_w/3]*3)
    vt.setStyle(TableStyle([
        ('LINEBEFORE', (1,0), (1,-1), 0.5, LGREY),
        ('LINEBEFORE', (2,0), (2,-1), 0.5, LGREY),
        ('TOPPADDING', (0,0), (-1,-1), 2),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(vt)
    story.append(Spacer(1, 1*mm))

    # Comments
    story.extend(section_title('COMMENTS / MEDICAL ADVICE'))
    comments = [
        director.get('comment_one'),
        director.get('comment_two'),
        director.get('comment_three'),
        director.get('comment_four'),
    ]
    for i, c in enumerate(comments, 1):
        row = Table(
            [[_para(f'{i}.', 9, bold=True), _para(c or '-', 9)]],
            colWidths=[8*mm, usable_w - 8*mm],
            style=TableStyle([
                ('VALIGN', (0,0), (-1,-1), 'TOP'),
                ('TOPPADDING', (0,0), (-1,-1), 1),
                ('BOTTOMPADDING', (0,0), (-1,-1), 2),
            ])
        )
        story.append(row)

    story.append(Spacer(1, 1*mm))

    # Certification
    story.extend(section_title('CERTIFICATIONS'))
    cert_st = ParagraphStyle('cert', fontSize=9, leading=13, spaceAfter=1.5*mm)
    story.append(Paragraph(
        'I hereby <b>certify</b> that a <b>comprehensive medical evaluation</b> with relevant '
        '<b>medical investigations</b> were carried out on the above named staff on the '
        'aforementioned date and time.',
        cert_st
    ))

    # Acronyms
    story.extend(section_title('ACRONYMS & INITIALISMS'))
    acros = [
        [('FBC', 'FULL BLOOD COUNT'), ('LDL-c', 'LOW DENSITY LIPOPROTEIN'), ('TB', 'TOTAL BILIRUBIN')],
        [('TC', 'TOTAL CHOLESTEROL'), ('AST', 'ASPARTATE AMINOTRANSFERASE'), ('CB', 'CONJUGATED BILIRUBIN')],
        [('TG', 'TRIGLYCERIDE'), ('ALT', 'ALANINE AMINOTRANSFERASE'), ('NAD', 'NO ABNORMALITY DETECTED')],
        [('HDL-c', 'HIGH DENSITY LIPOPROTEIN'), ('ALP', 'ALKALINE PHOSPHATASE'), ('', '')],
    ]
    acro_cells = []
    acro_style = ParagraphStyle('acro', fontSize=7, leading=9)
    acro_bold  = ParagraphStyle('acrob', fontSize=7, fontName='Helvetica-Bold', leading=9)

    for row in acros:
        acro_cells.append([
            Paragraph(f'<b>{abbr}</b>  {full}', acro_style) if abbr else Paragraph('', acro_style)
            for abbr, full in row
        ])

    acro_table = Table(acro_cells, colWidths=[usable_w/3]*3)
    acro_table.setStyle(TableStyle([
        ('TOPPADDING', (0,0), (-1,-1), 1),
        ('BOTTOMPADDING', (0,0), (-1,-1), 1),
    ]))
    story.append(acro_table)
    story.append(HRFlowable(width=usable_w, thickness=1.5, color=BLACK, spaceBefore=1*mm, spaceAfter=1*mm))

    # Footer (page 2)
    story.extend(page_footer(branding, report_data))

    def draw_footer(canvas, doc):
        canvas.saveState()
        canvas.setFont('Helvetica-Bold', 9)
        canvas.setFillColor(colors.HexColor('#666666'))
        # Place page number directly below the footer stack area
        canvas.drawRightString(W - PR, 4*mm, f"Page {doc.page} of 2")
        canvas.restoreState()

    doc.build(story, onFirstPage=draw_footer, onLaterPages=draw_footer)
    return buf.getvalue()
