import {useState, useRef	} from 'react'
import { WaveFile } from 'wavefile';

export default function useOpenAiLlm({onUpdate, onComplete, onReady}) {
    const [isBusy, setIsBusy] = useState(false);
    const aiKey = useRef('')
    
	function init(openAIKey) {
		//console.log("ai init")
		aiKey.current = openAIKey
		if (onReady) onReady()
	}
	
	function stop() {
		//console.log("ai stop")
		setIsBusy(false)
	}
	
	function start(systemMessage, chatHistory, model='gpt-3.5-turbo-0125') {
		//console.log("ai start",model,chatHistory)
		let ch = JSON.parse(JSON.stringify(chatHistory))
		ch.unshift({role:"system", content:systemMessage})
		setIsBusy(true)
		let formData = {
			model: model,
			messages: ch
		}
		//"temperature": 1,
		  //"max_tokens": 321,
		  //"top_p": 1,
		  //"frequency_penalty": 0,
		  //"presence_penalty": 0,
		  //"stop": ["."]
		  //"output_json": ["."]
		
		// # gemini - stop, temperature, tokens, output json
		
		
		try {
			fetch('https://api.openai.com/v1/chat/completions', {
				method: 'POST',
				headers: {
					'Authorization': 'Bearer '+aiKey.current,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(formData),
			}).then(function(response) {
				//console.log("ai response",response)
				if (!response.ok) {
					throw new Error('Failed to transcribe audio');
				}

				response.json().then(function(data) {
					//console.log(data)
					
					if (data && data.choices && data.choices.length > 0 && data.choices[0].message && data.choices[0].message.content  && onComplete) {
						setIsBusy(false)
						onComplete(data.choices[0].message.content, { 
							tokens_in: data.usage && data.usage.prompt_tokens ? parseInt(data.usage.prompt_tokens) : 0,
							tokens_out: data.usage && data.usage.completion_tokens ? parseInt(data.usage.completion_tokens) : 0,
							model: data.model,
							key: aiKey.current
						})
					} else {
						setIsBusy(false)
					}
				})
			})
		} catch (error) {
			console.error('Transcription error:', error);
		}
		
	}
			
    
    return {init, stop, start, isBusy}
}

