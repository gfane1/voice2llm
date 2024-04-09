# Voice2LLM

This repository provides a web service that integrates whisper speech to text,
coqui text to speech and a language model compatiable with GPT4All.

The default web page provides a chat web interface for talking to the model.

Streaming is used throughout to minimise latency


## Quickstart (localhost)

- install docker 
- ```docker-compose up```

For a custom domain
- map a domain name to your IP address and configure port forwarding from your router to ports 443 and 5002
- copy the .env.sample file to .env and edit to update the domain name and email address
- ```docker-compose up```


