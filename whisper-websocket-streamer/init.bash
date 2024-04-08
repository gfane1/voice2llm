. ./.venv/bin/activate



/app/.venv/bin/python -m gunicorn --bind 0.0.0.0:9000 --workers 1 --pid /tmp/unpid --timeout 1 whisper-websocket-streamer.webservice:app -k uvicorn.workers.UvicornWorker




