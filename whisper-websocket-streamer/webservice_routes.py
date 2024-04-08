import os
import sys
from typing import BinaryIO, Union, Annotated
import ffmpeg

from fastapi import FastAPI, File, UploadFile, Query, applications, Request, WebSocket, WebSocketDisconnect
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.responses import StreamingResponse, RedirectResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from urllib.parse import quote
from typing import Optional
from fastapi.templating import Jinja2Templates
# from whisper import tokenizer

# sys.path.append(os.path.dirname(os.path.abspath(__file__)))
# from whisper_online import *
# from constants import SAMPLING_RATE, LANG


def add_routes(app):
	
	# LANGUAGE_CODES = sorted(list(tokenizer.LANGUAGES.keys()))

	# from faster_whisper_core import transcribe, language_detection

	# swagger generated api
	# assets_path = os.getcwd() + "/swagger-ui-assets"
	# if os.path.exists(assets_path + "/swagger-ui.css") and os.path.exists(assets_path + "/swagger-ui-bundle.js"):
		# app.mount("/assets", StaticFiles(directory=assets_path), name="static")


		# def swagger_monkey_patch(*args, **kwargs):
			# return get_swagger_ui_html(
				# *args,
				# **kwargs,
				# swagger_favicon_url="",
				# swagger_css_url="/assets/swagger-ui.css",
				# swagger_js_url="/assets/swagger-ui-bundle.js",
			# )


		# applications.get_swagger_ui_html = swagger_monkey_patch


	# @app.get("/", response_class=RedirectResponse, include_in_schema=False)
	# async def index():
		# return "/docs"

	# index page
	base_path = os.path.dirname(os.path.abspath(__file__))+"/web_server_resources/"
	templates = Jinja2Templates(directory= base_path + "templates")
	app.mount("/assets", StaticFiles(directory=base_path + "/static"), name="static")
	@app.get("/")
	def read_root(request: Request):
		return templates.TemplateResponse("index.html", {"request": request})


	 
	# # post whole file to ASR
	# @app.post("/asr", tags=["Endpoints"])
	# async def asr(
			# audio_file: UploadFile = File(...),
			# encode: bool = Query(default=True, description="Encode audio first through ffmpeg"),
			# task: Union[str, None] = Query(default="transcribe", enum=["transcribe", "translate"]),
			# language: Union[str, None] = Query(default=None, enum=LANGUAGE_CODES),
			# initial_prompt: Union[str, None] = Query(default=None),
			# vad_filter: Annotated[bool | None, Query(
					# description="Enable the voice activity detection (VAD) to filter out parts of the audio without speech",
					# include_in_schema=(True if ASR_ENGINE == "faster_whisper" else False)
				# )] = False,
			# word_timestamps: bool = Query(default=False, description="Word level timestamps"),
			# output: Union[str, None] = Query(default="txt", enum=["txt", "vtt", "srt", "tsv", "json"])
	# ):
	   # # raise Exception("help me out here")
		# result = transcribe(load_audio(audio_file.file, encode), task, language, initial_prompt, vad_filter, word_timestamps, output)
		# return StreamingResponse(
		# result,
		# media_type="text/plain",
		# headers={
			# 'Asr-Engine': ASR_ENGINE,
			# 'Content-Disposition': f'attachment; filename="{quote(audio_file.filename)}.{output}"'
		# }
	# )

	# # language detection on whole file
	# @app.post("/detect-language", tags=["Endpoints"])
	# async def detect_language(
			# audio_file: UploadFile = File(...),
			# encode: bool = Query(default=True, description="Encode audio first through FFmpeg")
	# ):
		# detected_lang_code = language_detection(load_audio(audio_file.file, encode))
		# return {"detected_language": tokenizer.LANGUAGES[detected_lang_code], "language_code": detected_lang_code}



	

