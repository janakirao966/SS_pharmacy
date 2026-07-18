import os
from PIL import Image

def optimize_image(src_path, dest_webp_path, max_width=None):
    if not os.path.exists(src_path):
        print(f"Skipping: {src_path} (does not exist)")
        return
    
    img = Image.open(src_path)
    
    if max_width and img.width > max_width:
        ratio = max_width / float(img.width)
        height = int((float(img.height) * float(ratio)))
        img = img.resize((max_width, height), Image.Resampling.LANCZOS)
        print(f"Resized {src_path} to {max_width}x{height}")
        
    img.save(dest_webp_path, "WEBP", quality=85)
    print(f"Saved optimized {dest_webp_path} ({os.path.getsize(dest_webp_path)} bytes)")

# 1. Optimize logo
optimize_image(
    "public/products/logo/logo.png",
    "public/products/logo/logo.webp",
    max_width=300
)

# 2. Optimize chemist_lab
optimize_image(
    "public/products/chemist_lab.png",
    "public/products/chemist_lab.webp",
    max_width=800
)

# 3. Optimize home page image
optimize_image(
    "public/products/Hero section/home page image.png",
    "public/products/Hero section/home_page_image.webp",
    max_width=1200
)
