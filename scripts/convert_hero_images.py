import os
from PIL import Image

def convert_png_to_webp():
    base_dir = os.path.join(os.getcwd(), 'public', 'products', 'Hero section')
    
    mapping = {
        'pain cream hero section.png': 'hero-pain-cream-desktop.webp',
        'pain cream mobile version.png': 'hero-pain-cream-mobile.webp',
        'hero section pain pills.png': 'hero-pain-pills-desktop.webp',
        'hero section pain pills mobile version.png': 'hero-pain-pills-mobile.webp',
        'hero section moon.png': 'hero-moon-desktop.webp',
        'hero section moon mobile version.png': 'hero-moon-mobile.webp',
        'hero section main desktop.png': 'hero-main-desktop.webp',
        'hero section main mobile version.png': 'hero-main-mobile.webp',
        'madebynature.png': 'madebynature.webp'
    }
    
    print(f"Converting PNG files in: {base_dir}")
    
    for src_filename, dest_filename in mapping.items():
        src_path = os.path.join(base_dir, src_filename)
        dest_path = os.path.join(base_dir, dest_filename)
        
        if os.path.exists(src_path):
            try:
                with Image.open(src_path) as img:
                    img.save(dest_path, 'WEBP', quality=88, method=6)
                    src_size = os.path.getsize(src_path) / 1024
                    dest_size = os.path.getsize(dest_path) / 1024
                    print(f"[OK] Converted '{src_filename}' ({src_size:.1f} KB) -> '{dest_filename}' ({dest_size:.1f} KB)")
            except Exception as e:
                print(f"[ERR] Failed to convert '{src_filename}': {e}")
        else:
            print(f"[WARN] Source file not found: {src_path}")

if __name__ == '__main__':
    convert_png_to_webp()
