# main image
FROM nvcr.io/nvidia/cuda:12.2.2-cudnn8-devel-ubuntu22.04

ENV PYTHON_VERSION=3.10
ENV PATH=/app/.local/bin:$PATH

RUN export DEBIAN_FRONTEND=noninteractive \
    && apt-get -qq update \
    && apt-get -qq install -y --no-install-recommends \
    build-essential \
    git \
    pkg-config \
    yasm \
    ca-certificates \
    openssl \
    certbot \
    wget \
    python${PYTHON_VERSION} \
    python${PYTHON_VERSION}-venv \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

RUN ln -s -f /usr/bin/python${PYTHON_VERSION} /usr/bin/python3 && \
    ln -s -f /usr/bin/python${PYTHON_VERSION} /usr/bin/python && \
    ln -s -f /usr/bin/pip3 /usr/bin/pip


WORKDIR /app

RUN addgroup appgroup \
  && useradd -d /app appuser \
 && usermod appuser -G appgroup \
 && chown -R appuser:appgroup /app
 
USER appuser
	

RUN /usr/bin/python -m venv .venv
RUN /app/.venv/bin/pip install ctranslate2
RUN /app/.venv/bin/pip install torch 
    
RUN /app/.venv/bin/pip install uvicorn["standard"] gunicorn tqdm python-multipart ffmpeg-python fastapi llvmlite numba openai-whisper faster-whisper torchaudio jinja2 librosa soundfile mosestokenizer numpy webrtcvad-wheels vllm

#COPY ./whisper-websocket-streamer /app/whisper-websocket-streamer

RUN /app/.venv/bin/pip install gpt4all cryptography

USER root
RUN apt-get update && apt-get install -y nano libvulkan1 libnvidia-gl-525-server

#USER appuser

EXPOSE 9000


CMD /app/.venv/bin/python -m gunicorn --bind 0.0.0.0:9000 --workers 1 --timeout 0 whisper-websocket-streamer.webservice:app -k uvicorn.workers.UvicornWorker
