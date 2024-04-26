import importlib.metadata
import os
import random
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
from multiprocessing import Process
import concurrent.futures
import multiprocessing

from whisper import tokenizer
from typing import Optional

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
# from whisper_online import *
from constants import SAMPLING_RATE,LANG, LLM_MAX_SENTENCES, LLM_MODEL, LLM_MODEL_PATH
from audio_utils import *
from faster_whisper_core import transcribe
# import torch
# torch.set_num_threads(1)
from vad import VadDetector
from gpt4all import GPT4All
from nltk.tokenize import sent_tokenize
import nltk

nltk.download('punkt')

from typing import Annotated, Union

from fastapi import (
    Cookie,
    Depends,
    FastAPI,
    Query,
    WebSocket,
    WebSocketException,
    status,
)
from fastapi.responses import HTMLResponse


import google.generativeai as genai

print("GEMINI")

def add_gemini_llm_streaming_routes(app):

	
	# LLM
	#model_name = "pastiche-crown-clown-7b-dare.Q4_0.gguf"
	#model = GPT4All(model_name = LLM_MODEL, model_path=LLM_MODEL_PATH, device="gpu")
	# low memory option 1
	#model = GPT4All(model_name = "orca-mini-3b-gguf2-q4_0.gguf", model_path="/app/GPT4All", device="gpu")
	manager = multiprocessing.Manager()
	#llm_websocket_clients = {} #manager.dict()
	is_stopped = manager.dict()
			
		
	class StopException(Exception):
		pass
				
	
	async def get_cookie_or_token(
		websocket: WebSocket,
		session: Annotated[Union[str, None], Cookie()] = None,
		token: Annotated[Union[str, None], Query()] = None,
	):
		if session is None and token is None:
			raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION)
		return session or token


			
	@app.websocket("/llm/gemini/{client_id}/ws")
	async def websocket_endpoint(
		*,
		websocket: WebSocket,
		client_id: str,
		q: Union[int, None] = None,
		cookie_or_token: Annotated[str, Depends(get_cookie_or_token)],
	):
		try:
			#print("clientId",client_id, cookie_or_token)
			# TODO decrypt token using client_id and secret and verify
			#llm_websocket_clients[client_id] = []
			
			system_prompt = """### System:
You are a grumpy assistant who answers questions in the style of shakespeare
### User:			
			"""
			
			kill_me = False
			is_stopped[client_id] = False
			shared_list = manager.list()
			
			async def accept_requests():
				# print('LLM ACCEPT REQUESTS', is_stopped)
				while True:
					msg = await websocket.receive_json()
					print(json.dumps(msg))	
					if msg.get('stop',False):
						# print('LLM HANDLE FINISH REQUEST')
						is_stopped[client_id] = True
					else:
						shared_list.append(msg)
						#raise StopException()
					# await asyncio.sleep(0)
				# print('DONE LLM ACCEPT REQUESTS', is_stopped)
			
			async def response_generator(prompt,chat):
				print('RESPONSE GEN gemini',prompt,chat)
				config = genai.GenerationConfig(max_output_tokens=400)
			
				response = await chat.send_message_async(prompt, stream=True, generation_config=config)
				async for chunk in response:
					print(chunk)
					if is_stopped[client_id]:
						break
					try:
						yield chunk.text
					except:
						pass
		
				
				
				
				# # a better way to use an executor:
				# generator = model.generate(prompt, streaming=True) #, callback = callback)
				# event_loop = asyncio.get_running_loop()
				# has_tokens = True

				# def consume(generator):
				# #	print('CONSUME')
					# nonlocal has_tokens
					# try:
						# return next(generator)
					# except StopIteration:
						# has_tokens = False
				
				# while has_tokens and not is_stopped[client_id]:
					# try:
						# token = await event_loop.run_in_executor(None, consume, generator)
					# except RuntimeError:
						# break;	
					# # print('CONSUME TOK')
					# # print(token)
					# if token is not None:
						# yield token
					# await asyncio.sleep(0.2)
				# # print('END RESPONSE GEN')
				
			async def handle_requests(chat):
				# print('LLM HANDLE REQUESTS')
				while True:
					while not is_stopped[client_id]:
						# print('RUN HANDLE REQUESTS')
						# print('@',shared_list)
						if len(shared_list) > 0:
							user_query = shared_list.pop()
							#print('@@',user_query)
							t = time.time()
							text_so_far = ''
							await websocket.send_text(json.dumps({'started': time.time()}))
							async for token in response_generator(user_query.get('query',''),chat): #, streaming = True, callback= callback):
								print(f'***** {token}', is_stopped)
								text_so_far += token
								# text_so_far = model.current_chat_session[-1].get('content')
								if len(sent_tokenize(text_so_far)) > LLM_MAX_SENTENCES :
									print("FORCE END LIMIT SENTENCES")
									is_stopped[client_id] = True
								else:
									await websocket.send_text(json.dumps({'token': token}))
								
								#print(sentences)
								# TODO allow for last non full stop
								# if '.' in token:
									# to_send = json.dumps({'response': sentences[-2] + "."})
									# print(f'TOSEND %s ' % to_send[0:20])
									# await websocket.send_text(to_send)
								
								await asyncio.sleep(0.3)
								# if len(sentences) > 2 or not token:
									# return False
								# else:
									# return True
								
								
							# finished
							n = time.time() - t
							await websocket.send_text(json.dumps({'finished': n}))
							# print(f"query in %s" % n)
					
						await asyncio.sleep(1)
						# print('END RUN HANDLE REQUESTS')
					# print('END LLM INNER')
					is_stopped[client_id] = False
					await asyncio.sleep(1)
				# print('DONE LLM HANDLE REQUESTS')
			
			await websocket.accept()

			genai.configure(api_key=os.environ['GOOGLE_GEMINI_API_KEY'])
			model = genai.GenerativeModel("gemini-pro")
			chat = model.start_chat()

			# with model.chat_session(system_prompt=system_prompt) as chat_session: #, prompt_template=prompt_template):
				# print('LLM START')
				# try:
			await asyncio.gather(accept_requests(),handle_requests(chat))
				# except Exception as e:
					# print('LLM STOP',e)
					# raise e
					# kill_me = True
					
				# print('LLM END')
				
		except WebSocketDisconnect:
			print('LLMCLOSE WS CONNECT CLIENT')
			#kill_me = True
			#pass
			
		
