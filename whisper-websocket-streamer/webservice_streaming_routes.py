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
from constants import SAMPLING_RATE,LANG
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

	
async def shutdown(loop, signal = None):
	print('HANDLE shutdown')
	logging.info(f"Received exit signal")
	#sys.exit()
	tasks = [t for t in asyncio.all_tasks() if t is not
			 asyncio.current_task()]
	for task in tasks:
		try:
			task.cancel()
		except asyncio.CancelledError:
			pass
		except:
			print(f"Unexpected error:", sys.exc_info()[0])   
		
	print("Cancelling outstanding tasks")
	print(f'tasks {tasks}')
	try:
		await asyncio.gather(*tasks, return_exceptions=True)
	except:
		print(f"Unexpected error:", sys.exc_info()[0])   
	try:    
		loop.stop()
	except :
		pass	
	

def add_streaming_routes(app):
	
	# TTS
	@app.websocket("/asrstream")
	async def websocket_endpoint(websocket: WebSocket, clientId: Optional[int] = None):
		
		try:
			audio_buffer = asyncio.Queue()
			
			async def vad_callback():
				now = time.time()
				# print(f"VAD CALLBACK {now}")
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
				s = time.time()
				with tempfile.NamedTemporaryFile(suffix=".wav") as output_file:
					print(output_file)
					print(output_file.name)
					await write_queue_to_audio_file(output_file.name,audio_buffer, True)
					o = transcribe(load_audio(io.FileIO(output_file.name), False), 'transcribe', "en", "", False, True, "json")	
					t = json.loads(o.read()).get('text')
					n = time.time() - s
					#print(f"transcript in %s" % n,t)
					if t:
						await websocket_send_json({"transcription": t})
					audio_buffer = asyncio.Queue()
					
			await websocket.accept()
				
			# loop until websocket dies
			while True:
				# loop until None message or timeout then reset audio buffer and vad
				while True:
					try:
						msg = await asyncio.wait_for(websocket.receive(), timeout=3)
						await asyncio.sleep(0)  # Yield to event loop for timeout handling
						if msg is None:
							break
						data_bytes = msg.get('bytes')
						if data_bytes is None:
							break
						sf = soundfile.SoundFile(io.BytesIO(data_bytes), channels=1,endian="LITTLE",samplerate=SAMPLING_RATE, subtype="PCM_16",format="RAW")
						audio, _ = librosa.load(sf,sr=SAMPLING_RATE,dtype=np.float32)
						await audio_buffer.put(audio)
						await vad.feed(data_bytes)
					except asyncio.TimeoutError:
						break
				# reset buffers when loop breaks after None message
				audio_buffer = asyncio.Queue()
				vad = VadDetector(vad_callback)
				
			
		except WebSocketDisconnect:
			print('CLOSE WS CONNECT CLIENT')
			pass
			
		
	
	# LLM
	#model_name = "pastiche-crown-clown-7b-dare.Q4_0.gguf"
	model = GPT4All(model_name = "pastiche-crown-clown-7b-dare.Q4_0.gguf", model_path="/app/GPT4All", device="gpu")
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


			
	@app.websocket("/llm/{client_id}/ws")
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
			MAX_SENTENCES = 1
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
			
			async def response_generator(prompt):
				# print('RESPONSE GEN')
				# a better way to use an executor:
				generator = model.generate(prompt, streaming=True) #, callback = callback)
				event_loop = asyncio.get_running_loop()
				has_tokens = True

				def consume(generator):
				#	print('CONSUME')
					nonlocal has_tokens
					try:
						return next(generator)
					except StopIteration:
						has_tokens = False
				
				while has_tokens and not is_stopped[client_id]:
					token = await event_loop.run_in_executor(None, consume, generator)
					# print('CONSUME TOK')
					# print(token)
					if token is not None:
						yield token
					await asyncio.sleep(0.2)
				# print('END RESPONSE GEN')
				
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
							await websocket.send_text(json.dumps({'started': time.time()}))
							async for token in response_generator(user_query.get('query','')): #, streaming = True, callback= callback):
								print(f'***** {token}', is_stopped)
								text_so_far += token
								# text_so_far = model.current_chat_session[-1].get('content')
								if len(sent_tokenize(text_so_far)) > MAX_SENTENCES :
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
			with model.chat_session(system_prompt=system_prompt) as chat_session: #, prompt_template=prompt_template):
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
			
		
		
		# except WebSocketDisconnect:
			# print('CLOSE WS CONNECT CLIENT')
			# shutdown(asyncio.get_event_loop())
			# pass	
			
		# async def handle_requests(shared_list):
			# args = [1, 2, 3, 4, 5]
			# with concurrent.futures.ProcessPoolExecutor(max_workers=4) as executor:
				# while True:
					# future_results = {executor.submit(process_function, arg, shared_list): arg for arg in args}
					# # print("ITER", future_results)
					# #break
					# # Get the results as they become available
					# for future in concurrent.futures.as_completed(future_results):
						# arg = future_results[future]
						# try:
							# result = future.result()
							# print(f"Result for argument {arg}: {result}")
							# await asyncio.sleep(0.2)	
						# except Exception as e:
							# print(f"Exception occurred for argument {arg}: {e}")
					# print("DONE RESULTS")
					# await asyncio.sleep(0.2)		
					# print("NEXT ROUND")		
		
		

			
			
			
						# force_stop = False
						# # print('rcv llm')
						# print(msg)
						# if msg is None:
							# break
						# context = msg.get('context','')
						# query = msg.get('query','')
						
						# if msg.get('stop',False):
							# raise StopException()
							# force_stop = True
							# print('FORCE STOP')
						# if query:
							# combined_query =  context + "\n"  + query
							# # print('query' + combined)
							
			
			
# def callback(response_id, response_text):
					# # print('CB check finish')
					# # print(response_text)
					# # if force_stop:
						# # print('CB END BY FORCE')
						# # return False 
					# sentences = []
					# # print(model.current_chat_session)
					# if model.current_chat_session:
						# text_so_far = model.current_chat_session[-1].get('content')
						# sentences = text_so_far.split(".")
					# print(sentences)
					# if len(sentences) > MAX_SENTENCES or not response_text:
						# print('CB END')
						# return False
					# else:
						# print('CB CONT')
						# return True
	
	# def f(name):
		# print('hello', name)
		# time.sleep(4)
		# print('bye', name)

	# p = Process(target=f, args=('bob',))
	# p.start()
	# p.join()
	
	# import concurrent.futures
# import os

# # Function to be executed in a different process
# def process_function(arg):
    # print(f"Executing process_function in process {os.getpid()} with argument {arg}")
    # return arg * 2

# if __name__ == "__main__":
    # # List of arguments for the function
    # args = [1, 2, 3, 4, 5]

    # # Number of concurrent processes (adjust as needed)
    # num_processes = min(os.cpu_count(), len(args))

    # # Using ProcessPoolExecutor to execute the function concurrently
    # with concurrent.futures.ProcessPoolExecutor(max_workers=num_processes) as executor:
        # # Submit the function for each argument
        # future_results = {executor.submit(process_function, arg): arg for arg in args}

        # # Get the results as they become available
        # for future in concurrent.futures.as_completed(future_results):
            # arg = future_results[future]
            # try:
                # result = future.result()
                # print(f"Result for argument {arg}: {result}")
            # except Exception as e:
                # print(f"Exception occurred for argument {arg}: {e}")
                
