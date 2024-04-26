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
# from gpt4all import GPT4All
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


from openai import AsyncOpenAI
import httpx

print("CHATGPT",os.environ.get('OPENAI_CHATGPT_API_KEY',''))

def add_chatgpt_llm_streaming_routes(app):

	manager = multiprocessing.Manager()
	is_stopped = manager.dict()
	
	client = AsyncOpenAI(
	  api_key=os.environ.get('OPENAI_CHATGPT_API_KEY',''),
	  http_client=httpx.AsyncClient(
		limits=httpx.Limits(
		  max_connections=1000,
		  max_keepalive_connections=100
		)
	  )
	) 		
		
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


			
	@app.websocket("/llm/chatgpt/{client_id}/ws")
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
			chat_history = []
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
			
			async def response_generator(history):
				print('RESPONSE GEN CHATGPT',history)
				if len(history) > 0:
					try:
						stream = await client.chat.completions.create(
							model="gpt-4",
							messages=history,
							stream=True,
						)
						async for chunk in stream:
							if is_stopped[client_id]:
								break
								
							if chunk.choices[0].delta.content is not None:
								print(chunk.choices[0].delta.content, end="")
								yield chunk.choices[0].delta.content
								
					except Exception: 
						pass
				
			async def handle_requests():
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
							chat_history.append({'role':'user', 'content': user_query.get('query','')})	
							print('CH START',chat_history)
							await websocket.send_text(json.dumps({'started': time.time()}))
							async for token in response_generator(chat_history): #, streaming = True, callback= callback):
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
								
							chat_history.append({'role':'assistant', 'content': text_so_far})		
							print('CH END',chat_history)
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
			# chat_history = []
       
        
			# genai.configure(api_key=os.environ['OPENAI_CHATGPT_API_KEY'])
			# model = genai.GenerativeModel("gemini-pro")
			# chat = model.start_chat()

			# with model.chat_session(system_prompt=system_prompt) as chat_session: #, prompt_template=prompt_template):
				# print('LLM START')
				# try:
			await asyncio.gather(accept_requests(),handle_requests())
				# except Exception as e:
					# print('LLM STOP',e)
					# raise e
					# kill_me = True
					
				# print('LLM END')
				
		except WebSocketDisconnect:
			print('LLMCLOSE WS CONNECT CLIENT')
			#kill_me = True
			#pass
			
		
        

