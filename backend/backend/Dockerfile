# backend/backend/Dockerfile
FROM python:3.11-slim

# System deps for OCR and PDF conversion
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr libtesseract-dev \
    poppler-utils \
    build-essential libpq-dev && \
    rm -rf /var/lib/apt/lists/*

# (Optional) Add any extra Tesseract language packs, e.g.:
# RUN apt-get update && apt-get install -y tesseract-ocr-eng tesseract-ocr-deu

WORKDIR /app

# Install Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# App code
COPY . .

# Expose port that Render will map
ENV PORT=10000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "10000"]
