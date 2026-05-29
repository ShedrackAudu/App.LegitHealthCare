import os
import re

workspace_dir = r"c:\Users\DELL\Documents\Legit HealthCare\Legit HealthCare WebApp\App.LegitHealthCare\frontend"
index_d_ts = os.path.join(workspace_dir, "node_modules", "@hugeicons", "core-free-icons", "dist", "types", "index.d.ts")

with open(index_d_ts, "r", encoding="utf-8") as f:
    dts_content = f.read()

valid_exports = set(re.findall(r"declare const (\w+)", dts_content))

invalid_names = [
    'Information', 'ShieldCheck', 'ShieldIcon', 'KeyIcon', 'RobotIcon',
    'Check', 'ChevronRight', 'ChevronDown', 'ChevronUp', 'History',
    'ShieldAlert', 'ActivityIcon', 'TerminalIcon', 'FileText', 'ImageIcon',
    'FileSpreadsheetIcon', 'MoreVertical', 'Box', 'DeliveryTruckIcon',
    'LayersIcon', 'TrendingUp', 'FacebookIcon', 'LinkedinIcon', 'MicIcon',
    'VideoIcon', 'TickDoubleIcon', 'Reply', 'VolumeMuteIcon', 'Hash',
    'Server', 'MegaphoneIcon', 'Wind', 'CopyIcon'
]

print("--- Recommendations for Invalid Icons ---")
for name in invalid_names:
    # Try exact match with 'Icon' suffix
    icon_name = f"{name}Icon"
    if icon_name in valid_exports:
        print(f"{name} -> {icon_name}")
        continue
    
    # Try case-insensitive fuzzy matches containing the name
    matches = [exp for exp in valid_exports if name.lower() in exp.lower()]
    # Sort matches by length (shortest first) to get closest name
    matches.sort(key=len)
    print(f"{name} -> Recommendations: {matches[:5]}")
