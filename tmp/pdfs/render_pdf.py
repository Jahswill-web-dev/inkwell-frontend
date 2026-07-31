from pathlib import Path

import pypdfium2 as pdfium
from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[2]
pdf_path = ROOT / "output" / "pdf" / "inkwell_product_features.pdf"
render_dir = ROOT / "tmp" / "pdfs" / "rendered"
render_dir.mkdir(parents=True, exist_ok=True)

pdf = pdfium.PdfDocument(str(pdf_path))
images = []
for index in range(len(pdf)):
    page = pdf[index]
    bitmap = page.render(scale=1.6)
    image = bitmap.to_pil().convert("RGB")
    target = render_dir / f"page-{index + 1:02d}.png"
    image.save(target)
    images.append(image)

thumb_width = 330
margin = 20
label_height = 24
thumbs = []
for index, image in enumerate(images):
    ratio = thumb_width / image.width
    resized = image.resize((thumb_width, int(image.height * ratio)))
    card = Image.new("RGB", (thumb_width, resized.height + label_height), "white")
    card.paste(resized, (0, label_height))
    draw = ImageDraw.Draw(card)
    draw.text((8, 5), f"Page {index + 1}", fill="#263248")
    thumbs.append(card)

cols = 2
rows = (len(thumbs) + cols - 1) // cols
cell_height = max(image.height for image in thumbs)
sheet = Image.new(
    "RGB",
    (margin + cols * (thumb_width + margin), margin + rows * (cell_height + margin)),
    "#D9E1E7",
)
for index, image in enumerate(thumbs):
    x = margin + (index % cols) * (thumb_width + margin)
    y = margin + (index // cols) * (cell_height + margin)
    sheet.paste(image, (x, y))
sheet.save(render_dir / "contact-sheet.png")
print(f"pages={len(pdf)}")
print(render_dir / "contact-sheet.png")
