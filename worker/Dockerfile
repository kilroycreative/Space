FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    ripgrep git curl \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir \
    rich>=13.0 \
    prompt_toolkit>=3.0 \
    pyfiglet>=1.0 \
    flask \
    flask-cors

COPY agent/ ./agent/
COPY worker/ ./worker/
COPY pyproject.toml ./

RUN mkdir -p /workspace
ENV OPENPLANTER_WORKSPACE=/workspace
ENV WORKER_PORT=5001

EXPOSE 5001

CMD ["python", "worker/app.py"]
