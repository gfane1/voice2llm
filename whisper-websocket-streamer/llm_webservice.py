import sys
import os
from fastapi.middleware.cors import CORSMiddleware

from fastapi import FastAPI, Request
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from webservice_routes import add_routes

print("GEMINI KEY", os.environ.get('GOOGLE_GEMINI_API_KEY',''))
print("CHATPGPT KEY", os.environ.get('OPENAI_CHATGPT_API_KEY',''))

		
app = FastAPI(
    title="Whisper Webservice LLM",
    description='',
    version='0.0.1',
    contact={
        "url": ''
    },
    license_info={
        "name": "",
        "url": ''
    }
)

if os.environ.get('GOOGLE_GEMINI_API_KEY',''):
	from llm_gemini_webservice_streaming_routes import add_gemini_llm_streaming_routes
	add_gemini_llm_streaming_routes(app)
if os.environ.get('OPENAI_CHATGPT_API_KEY',''):
	from llm_chatgpt_webservice_streaming_routes import add_chatgpt_llm_streaming_routes
	add_chatgpt_llm_streaming_routes(app)
if os.environ.get('LLM_MODEL',''):
	from llm_local_webservice_streaming_routes import add_local_llm_streaming_routes
	add_local_llm_streaming_routes(app)

# cors headers for cross domain access
app.add_middleware(
	CORSMiddleware,
	allow_origins=["*"],
	allow_credentials=True,
	allow_methods=["*"],
	allow_headers=["*"],
)

@app.on_event('startup')
async def startup():
	print('startup')
	
@app.on_event('shutdown')
async def shutdown():
	print('shutdown')
	

@app.exception_handler(Exception)
async def validation_exception_handler(request: Request, exc: Exception):
	# Change here to Logger
	print(str(exc))
	return JSONResponse(content="Something went wrong", status_code=500)
