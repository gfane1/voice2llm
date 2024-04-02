FROM nvcr.io/nvidia/cuda:12.2.2-cudnn8-devel-ubuntu22.04

# Additional packages installation
RUN apt-get update && \
    apt-get install -y wget git build-essential cmake libomp5 libomp-dev zlib1g

# Intel oneAPI MKL installation
RUN wget -O- https://apt.repos.intel.com/intel-gpg-keys/GPG-PUB-KEY-INTEL-SW-PRODUCTS.PUB | gpg --dearmor | tee /usr/share/keyrings/oneapi-archive-keyring.gpg > /dev/null && \
    echo "deb [signed-by=/usr/share/keyrings/oneapi-archive-keyring.gpg] https://apt.repos.intel.com/oneapi all main" | tee /etc/apt/sources.list.d/oneAPI.list && \
    apt-get update && \
    apt-get install -y intel-oneapi-mkl intel-oneapi-mkl-devel

# CTranslate2 installation
RUN git clone --recursive https://github.com/OpenNMT/CTranslate2.git && \
    cd CTranslate2 && \
    mkdir build && \
    cd build && \
    cmake -DWITH_MKL=ON -DWITH_CUDA=ON -DWITH_CUDNN=ON -DOPENMP_RUNTIME=INTEL .. && \
    make -j8 && \
    make install

# Build Python package
RUN apt-get install -y python3-pip checkinstall
RUN cd /CTranslate2/python && \
    pip install -r install_requirements.txt && \
    CTRANSLATE2_ROOT=/usr/local python3 setup.py bdist_wheel

# main image
FROM nvcr.io/nvidia/cuda:12.2.2-cudnn8-devel-ubuntu22.04

ENV PYTHON_VERSION=3.10
ENV PATH=/app/.local/bin:$PATH

COPY --from=0 /CTranslate2/python/dist/ctranslate2-4.1.0-cp310-cp310-linux_x86_64.whl /tmp/

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
RUN . .venv/bin/pip install /tmp/ctranslate2-4.1.0-cp310-cp310-linux_x86_64.whl
RUN . .venv/bin/pip install torch 
    
RUN . .venv/bin/pip install uvicorn["standard"] gunicorn tqdm python-multipart ffmpeg-python fastapi llvmlite numba openai-whisper faster-whisper torchaudio jinja2 librosa soundfile mosestokenizer numpy webrtcvad-wheels

COPY ./whisper-websocket-streamer /app/whisper-websocket-streamer

EXPOSE 9000


CMD gunicorn --bind 0.0.0.0:9000 --workers 1 --timeout 0 whisper-websocket-streamer.webservice:app -k uvicorn.workers.UvicornWorker
