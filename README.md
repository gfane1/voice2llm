# Voice2LLM

This repository provides a web service that integrates whisper speech to text,
coqui text to speech and a language model compatible with GPT4All.

The default web page provides a voice enabled chat web interface for talking to the model.

Streaming is used throughout to minimise latency.


## Superquick Start

The UI is hosted on [https://syntithenai.github.io/voice2llm/](https://syntithenai.github.io/voice2llm/).

It can be configured with an OpenAI api key or URLs to locally hosted services.

The UI is also hosted locally by the service suite that can be started with Docker.



## Quickstart (localhost)

- install docker
- copy the .env.sample file to .env and edit to provide configuration for preferred language model (open ai key) 
- ```docker-compose up```


## Custom SSL Domain for external access

- map a domain name to your IP address and configure port forwarding from your router to ports 443 (web and STT), 444 (LLM) and 5002(TTS)
- copy the .env.sample file to .env and edit to update the domain name and email address
- ```docker-compose up```


## Building the Frontend UI

```
cd voice2llm-ui
npm run build
```

The build script moves the resulting files to the docs file in the root of the project ready for hosting on github.


