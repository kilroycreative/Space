FROM python:3.11-slim

WORKDIR /app

# System deps for ripgrep (used by agent's search_files)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ripgrep \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Python deps
COPY pyproject.toml ./
RUN pip install --no-cache-dir \
    rich>=13.0 \
    prompt_toolkit>=3.0 \
    pyfiglet>=1.0 \
    flask \
    flask-socketio \
    gunicorn \
    eventlet

# Copy application code
COPY agent/ ./agent/
COPY dashboard/ ./dashboard/

# Workspace volume mount point
RUN mkdir -p /workspace
VOLUME /workspace

# Default env
ENV OPENPLANTER_WORKSPACE=/workspace
ENV DASHBOARD_PORT=5000
ENV DASHBOARD_HOST=0.0.0.0

EXPOSE 5000

CMD ["gunicorn", "--worker-class", "eventlet", "--workers", "1", "--bind", "0.0.0.0:5000", "--timeout", "600", "dashboard.app:app"]
