import os

replacements = {
    "Má»šI": "MỚI",
    "Láº¥y": "Lấy",
    "danh sĂ¡ch": "danh sách",
    "nhĂ\u00a0": "nhà ",
    "nhĂ ": "nhà ",
    "trá» ": "trọ",
    "CHá»ˆ": "CHỈ",
    "Táº\u00a0O": "TẠO",
    "Táº O": "TẠO",
    "Láº¤Y": "LẤY",
    "DANH SĂ CH": "DANH SÁCH",
    "PHĂ’NG": "PHÒNG",
    "KHU TRá»Œ": "KHU TRỌ",
    "bĂ\u00a0i": "bài",
    "KIá»‚M": "KIỂM",
    "DUYá»†T": "DUYỆT",
    "NỘI DUNG": "NỘI DUNG",
    "Gá»™p": "Gộp",
    "thÆ°á» ng": "thường",
    "toĂ\u00a0n bá»™": "toàn bộ",
    "toĂ n bá»™": "toàn bộ",
    "THĂŠM": "THÊM",
    "VĂ€O": "VÀO",
    "Quyá» n": "Quyền",
    "Cáº\u00adp": "Cập",
    "nháº\u00adt": "nhật",
    "trÆ°á» ng": "trường",
    "trĂ¡nh": "tránh",
    "lá»—i": "lỗi",
    "Láº¡i": "Lại",
    "Ä‘á»ƒ": "để",
    "Ä‘áº§y Ä‘á»§": "đầy đủ",
    "thĂ´ng": "thông",
    "Ä‘áº·t cá» c": "đặt cọc",
    "chá»‰": "chỉ",
    "thĂªm": "thêm",
    "gá»£i Ă½": "gợi ý",
    "Ä‘Ă£": "đã",
    "Ä‘Æ°á»£c": "được",
    "Ä‘iá» u kiá»‡n": "điều kiện",
    "thuĂª": "thuê",
    "hoáº·c": "hoặc"
}

def fix_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception:
        return

    original = content
    for k, v in replacements.items():
        content = content.replace(k, v)
        
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Fixed: {filepath}")

def scan_dir(directory):
    for root, _, files in os.walk(directory):
        for file in files:
            if file.endswith('.java'):
                fix_file(os.path.join(root, file))

scan_dir(r"c:\Users\Tinh\Nam_4_1\mobile\HTH\KLTN_SmartRental\backend\src")
print("Done.")
