# Dev-oriented image: installs deps and runs the FastAPI app with reload.
# A leaner multi-stage production image can be added when Module B/C/F/G
# model weights make image size worth optimizing (Phase 4+).
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt requirements-dev.txt ./
RUN pip install --no-cache-dir -r requirements-dev.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
