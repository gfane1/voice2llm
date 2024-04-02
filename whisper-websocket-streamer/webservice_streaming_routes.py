import importlib.metadata
import os
import io
import time
import sys
import json
from os import path
import asyncio
import tempfile
import librosa
import soundfile
import numpy as np
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.responses import StreamingResponse, RedirectResponse, JSONResponse

from whisper import tokenizer
from typing import Optional

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
# from whisper_online import *
from constants import SAMPLING_RATE,LANG
from audio_utils import *
from faster_whisper_core import transcribe
# import torch
# torch.set_num_threads(1)
from vad import VadDetector

print('start server')


def add_streaming_routes(app):

	# asr = asr_faster_whisper()
	# tokenizer = create_tokenizer(LANG)
	
	@app.websocket("/asrstream")
	async def websocket_endpoint(websocket: WebSocket, clientId: Optional[int] = None):
		
		try:
			audio_buffer = asyncio.Queue()
			
			async def vad_callback():
				now = time.time()
				print(f"VAD CALLBACK {now}")
				try:
					await websocket_send_json({"vad_timeout" : True, "time": now})
					await transcribe_buffer(audio_buffer)
				except Exception as e:
					print(e)
					await websocket_send_json({"error": str(e)})

			vad = VadDetector(vad_callback)
			
			
			async def websocket_send_json(jsondata):
				try:
					await websocket.send_text(json.dumps(jsondata)) 
					# reset queue
				except Exception as e:
					print("WS send failed?")
					print(e)
			
			async def transcribe_buffer(audio_buffer):	
				with tempfile.NamedTemporaryFile(suffix=".wav") as output_file:
					print(output_file)
					print(output_file.name)
					# output_file = os.path.dirname(os.path.abspath(__file__)) + '/output.wav'
					await write_queue_to_audio_file(output_file.name,audio_buffer, True)
					o = transcribe(load_audio(io.FileIO(output_file.name), False), 'transcribe', "en", "", False, True, "json")	
					t = json.loads(o.read()).get('text')
					if t:
						await websocket_send_json({"transcription": t})
					audio_buffer = asyncio.Queue()
					
			
			
					
				
			await websocket.accept()
			print(f"accept {clientId}")
			# online = OnlineASRProcessor(asr,tokenizer,buffer_trimming=("sentence", 15))
			# online.init()
			
			# loop until websocket dies
			while True:
				# loop until None message
				while True:
					msg = await websocket.receive()
					if msg is None:
						print("no message break here",file=sys.stderr)
						break
					data_bytes = msg.get('bytes')
					if data_bytes is None:
						print("no data break here",file=sys.stderr)
						break
					sf = soundfile.SoundFile(io.BytesIO(data_bytes), channels=1,endian="LITTLE",samplerate=SAMPLING_RATE, subtype="PCM_16",format="RAW")
					audio, _ = librosa.load(sf,sr=SAMPLING_RATE,dtype=np.float32)
					
					await audio_buffer.put(audio)
					await vad.feed(data_bytes)
				# reset buffers when loop breaks after None message
				audio_buffer = asyncio.Queue()
				vad = VadDetector(vad_callback)
			
			
		except WebSocketDisconnect:
			print('CLOSE WS CONNECT CLIENT')
			pass
			
			
