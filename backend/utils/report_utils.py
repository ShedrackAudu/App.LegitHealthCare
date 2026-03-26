from fpdf import FPDF
import io

class ReportPDF(FPDF):
    def header(self):
        # Header Band
        self.set_fill_color(15, 23, 42) # #0f172a (Slate 900)
        self.rect(0, 0, 210, 40, 'F')
        
        # Logo / Icon placeholder (Activity icon style)
        self.set_fill_color(255, 255, 255)
        self.rect(15, 10, 15, 15, 'F')
        
        # Text Branding
        self.set_xy(35, 12)
        self.set_font('Arial', 'B', 22)
        self.set_text_color(255, 255, 255)
        self.cell(100, 10, 'LEGIT HEALTHCARE', ln=False)
        
        self.set_xy(35, 22)
        self.set_font('Arial', '', 9)
        self.set_text_color(200, 200, 200)
        self.cell(100, 5, 'STAFF MEDICAL SCREENING PROGRAM', ln=True)
        
        # Generated Date (Right Aligned)
        self.set_xy(150, 15)
        self.set_font('Arial', 'B', 8)
        self.set_text_color(160, 160, 160)
        self.cell(45, 5, 'GENERATED DATE', ln=True, align='R')
        self.set_xy(150, 20)
        self.set_font('Arial', 'B', 10)
        self.set_text_color(255, 255, 255)
        import datetime
        self.cell(45, 5, datetime.datetime.now().strftime('%d/%m/%Y'), ln=True, align='R')
        
        self.ln(25)

    def footer(self):
        self.set_y(-20)
        self.set_draw_color(230, 230, 230)
        self.line(10, self.get_y(), 200, self.get_y())
        self.set_y(-15)
        self.set_font('Arial', 'B', 8)
        self.set_text_color(100, 100, 100)
        self.cell(95, 10, 'LEGIT HEALTHCARE MEDICAL RECORDS', 0, 0, 'L')
        self.cell(95, 10, f'PAGE {self.page_no()} OF 2', 0, 0, 'R')

    def section_header(self, title):
        self.ln(5)
        self.set_font('Arial', 'B', 9)
        self.set_text_color(15, 23, 42)
        self.cell(0, 8, title.upper(), ln=True)
        self.set_draw_color(15, 23, 42)
        self.set_line_width(0.5)
        self.line(self.get_x(), self.get_y(), self.get_x() + 40, self.get_y())
        self.ln(4)

    def kv_box(self, label, value, w=90):
        self.set_font('Arial', 'B', 7)
        self.set_text_color(100, 100, 100)
        self.cell(w, 5, label.upper(), ln=True)
        self.set_font('Arial', 'B', 10)
        self.set_text_color(0, 0, 0)
        self.cell(w, 8, str(value or '-'), ln=True)
        self.ln(2)

def generate_patient_report_pdf(report_data):
    pdf = ReportPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()
    
    bio = report_data.get('bio', {})
    results = report_data.get('results', {})
    consult = results.get('consultation', {})
    
    # 1. Bio Data Grid
    pdf.section_header('Bio-Data & Identification')
    
    # Row 1
    start_y = pdf.get_y()
    pdf.set_xy(15, start_y)
    pdf.kv_box('Staff ID', bio.get('staff_id'), 90)
    pdf.set_xy(110, start_y)
    pdf.kv_box('Full Name', bio.get('full_name'), 90)
    
    # Row 2
    start_y = pdf.get_y() + 2
    pdf.set_xy(15, start_y)
    pdf.kv_box('Age', f"{bio.get('age')} Years", 90)
    pdf.set_xy(110, start_y)
    pdf.kv_box('Gender', bio.get('gender'), 90)
    
    # Row 3
    start_y = pdf.get_y() + 2
    pdf.set_xy(15, start_y)
    pdf.kv_box('Department', bio.get('department'), 90)
    pdf.set_xy(110, start_y)
    pdf.kv_box('Screening Year', bio.get('screening_year'), 90)
    
    pdf.ln(10)
    
    # 2. Vitals Grid (Matching the UI's boxes)
    pdf.section_header('Consultation & Vitals')
    
    # Drawing 3 Vitals Boxes
    start_y = pdf.get_y()
    vitals = [
        ('B.P', f"{consult.get('bp', 'N/A')}", 'mmHg'),
        ('Pulse', f"{consult.get('pulse', 'N/A')}", 'b/m'),
        ('SPO2%', f"{consult.get('spo2', 'N/A')}", 'Saturation')
    ]
    
    x_pos = 15
    for label, val, unit in vitals:
        pdf.set_fill_color(248, 250, 252) # Slate 50
        pdf.rect(x_pos, start_y, 60, 20, 'F')
        pdf.set_draw_color(226, 232, 240) # Slate 200
        pdf.rect(x_pos, start_y, 60, 20, 'D')
        
        pdf.set_xy(x_pos + 5, start_y + 3)
        pdf.set_font('Arial', 'B', 7)
        pdf.set_text_color(100, 100, 100)
        pdf.cell(50, 4, label.upper(), ln=True)
        
        pdf.set_xy(x_pos + 5, start_y + 8)
        pdf.set_font('Arial', 'B', 14)
        pdf.set_text_color(16, 185, 129) # Emerald 500
        pdf.cell(30, 8, val, ln=False)
        
        pdf.set_font('Arial', 'B', 7)
        pdf.set_text_color(148, 163, 184)
        pdf.cell(20, 8, unit, ln=True)
        
        x_pos += 65

    pdf.set_xy(15, start_y + 25)
    pdf.set_font('Arial', 'B', 7)
    pdf.set_text_color(100, 100, 100)
    pdf.cell(0, 5, 'CLINICAL ASSESSMENT', ln=True)
    pdf.set_font('Arial', 'I', 10)
    pdf.set_text_color(0, 0, 0)
    pdf.multi_cell(0, 6, consult.get('assessment', 'No clinical assessment notes recorded.'))
    
    pdf.ln(10)

    # 3. FBC Table
    pdf.section_header('Full Blood Count (Hematology)')
    
    # Table Header
    pdf.set_fill_color(248, 250, 252)
    pdf.set_font('Arial', 'B', 9)
    pdf.cell(60, 10, '  PARAMETER', 1, 0, 'L', True)
    pdf.cell(65, 10, 'VALUE', 1, 0, 'C', True)
    pdf.cell(60, 10, 'REFERENCE RANGE', 1, 1, 'L', True)
    
    fbc = results.get('fbc', {})
    params = [
        ('PCV', fbc.get('pcv'), '37 - 54%'),
        ('WBC', fbc.get('wbc'), '4.0 - 10.0 x10^9/L'),
        ('HGB', fbc.get('hgb'), '12.0 - 18.0 g/dL'),
        ('RBC', fbc.get('rbc'), '4.00 - 6.00 x10^12/L'),
        ('PLT', fbc.get('plt'), '150 - 450 x10^9/L')
    ]
    
    pdf.set_font('Arial', '', 9)
    for label, val, ref in params:
        pdf.set_font('Arial', 'B', 9)
        pdf.cell(60, 10, f"  {label}", 1, 0, 'L')
        pdf.set_font('Arial', 'B', 11)
        pdf.set_text_color(16, 185, 129)
        pdf.cell(65, 10, str(val or '-'), 1, 0, 'C')
        pdf.set_font('Arial', '', 8)
        pdf.set_text_color(100, 100, 100)
        pdf.cell(60, 10, ref, 1, 1, 'L')
        pdf.set_text_color(0, 0, 0)

    # PAGE 2
    pdf.add_page()
    
    # 4. KFT & LFT GRID
    start_y = pdf.get_y()
    
    # KFT Box
    pdf.section_header('Kidney Function (KFT)')
    kft = results.get('kft', {})
    pdf.set_font('Arial', 'B', 9)
    pdf.cell(45, 8, 'Potassium', 'B', 0); pdf.cell(45, 8, str(kft.get('potassium') or '-'), 'B', 1, 'R')
    pdf.cell(45, 8, 'Urea', 'B', 0); pdf.cell(45, 8, str(kft.get('urea') or '-'), 'B', 1, 'R')
    pdf.cell(45, 8, 'Creatinine', 'B', 0); pdf.cell(45, 8, str(kft.get('creatinine') or '-'), 'B', 1, 'R')
    
    # Shift up and to right for LFT
    pdf.set_xy(110, start_y)
    pdf.section_header('Liver Function (LFT)')
    pdf.set_xy(110, pdf.get_y())
    lft = results.get('lft', {})
    # Need to manually handle X for each cell for LFT
    curr_y = pdf.get_y()
    pdf.cell(45, 8, 'AST', 'B', 0); pdf.set_xy(155, curr_y); pdf.cell(40, 8, str(lft.get('ast') or '-'), 'B', 1, 'R')
    curr_y = pdf.get_y(); pdf.set_xy(110, curr_y)
    pdf.cell(45, 8, 'ALT', 'B', 0); pdf.set_xy(155, curr_y); pdf.cell(40, 8, str(lft.get('alt') or '-'), 'B', 1, 'R')
    curr_y = pdf.get_y(); pdf.set_xy(110, curr_y)
    pdf.cell(45, 8, 'ALP', 'B', 0); pdf.set_xy(155, curr_y); pdf.cell(40, 8, str(lft.get('alp') or '-'), 'B', 1, 'R')
    
    pdf.ln(15)

    # 5. Lipid Profile
    pdf.section_header('Lipid Profile')
    lipid = results.get('lipid', {})
    x_pos = 15
    start_y = pdf.get_y()
    lipid_tests = [('Total CHOL', 'tcho'), ('TG', 'tg'), ('HDL', 'hdl'), ('LDL', 'ldl')]
    for label, key in lipid_tests:
        pdf.set_draw_color(200, 200, 200)
        pdf.rect(x_pos, start_y, 42, 12, 'D')
        pdf.set_xy(x_pos, start_y + 1)
        pdf.set_font('Arial', 'B', 6)
        pdf.cell(42, 4, label.upper(), 0, 1, 'C')
        pdf.set_xy(x_pos, start_y + 5)
        pdf.set_font('Arial', 'B', 10)
        pdf.cell(42, 6, str(lipid.get(key) or '-'), 0, 1, 'C')
        x_pos += 47
        
    pdf.ln(12)

    # 6. Director Review
    pdf.section_header('Director Review & Verdict')
    director = results.get('director', {})
    pdf.set_fill_color(248, 250, 252)
    current_y = pdf.get_y()
    pdf.rect(15, current_y, 185, 40, 'F')
    pdf.set_draw_color(16, 185, 129) # Emerald
    pdf.set_line_width(0.8)
    pdf.line(15, current_y, 15, current_y + 40)
    
    pdf.set_xy(20, current_y + 5)
    pdf.set_font('Arial', '', 11)
    pdf.set_text_color(0, 0, 0)
    pdf.multi_cell(175, 7, director.get('assessment', 'Final medical assessment pending director verification.'))
    
    # Signature
    pdf.set_y(current_y + 50)
    pdf.set_font('Arial', 'B', 8)
    pdf.set_text_color(0, 0, 0)
    pdf.cell(0, 5, '__________________________', ln=True, align='R')
    pdf.cell(0, 5, 'MEDICAL DIRECTOR SIGNATURE', ln=True, align='R')

    return pdf.output(dest='S').encode('latin1')

