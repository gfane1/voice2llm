import {useState, useRef	} from 'react'
import { WaveFile } from 'wavefile';

// TODO
// NO CORS FOR GEMINI API. PERHAPS DIFFERENT WITH AN AUTH KEY. 

export default function useGoogleGeminiLlm({onUpdate, onComplete, onReady}) {
    const [isBusy, setIsBusy] = useState(false);
    const apiKey = useRef('')
    
    
    //curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=$GOOGLE_API_KEY" \
    //-H 'Content-Type: application/json' \
    //-X POST \
    //-d '{
      //"contents": [{
        //"parts":[{"text": "Give me python code to sort a list."}]
        //}]
       //}' 2> /dev/null
    
       //"contents": [
        //{"role":"user",
         //"parts":[{
           //"text": "In one sentence, explain how a computer works to a young child."}]},
        //{"role": "model",
         //"parts":[{
           //"text": "A computer is like a smart helper that can store information, do math problems, and follow our instructions to make things happen."}]},
        //{"role": "user",
         //"parts":[{
           //"text": "Okay, how about a more detailed explanation to a high schooler?"}]},
    
	function init(key) {
		//console.log("gemini init")
		apiKey.current = key
		if (onReady) onReady()
	}
	
	function stop() {
		//console.log("gemini stop")
	}
	
	function start(chatHistory, model='gemini-pro') {
		//console.log("gemini start",model,chatHistory)
		setIsBusy(true)
		let formData = {
			model: model,
			contents: chatHistory.map(function(item) {
				return {role: item.role, parts:[{text:item.content}]}
			})	
		}
		
		try {
			fetch('https://generativelanguage.googleapis.com/v1beta/models/' + model + '?key='+apiKey.current , {
				method: 'POST',
				headers: {
					//'Authorization': 'Bearer '+aiKey.current,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(formData),
			}).then(function(response) {
				//console.log("gemini response",response)
				if (!response.ok) {
					throw new Error('Failed to transcribe audio');
				}

				response.json().then(function(data) {
					//console.log(data)
					
					if (data && data.choices && data.choices.length > 0 && data.choices[0].message && data.choices[0].message.content  && onComplete) {
						setIsBusy(false)
						onComplete(data.choices[0].message.content)
					} else {
						setIsBusy(false)
					}
				})
			})
		} catch (error) {
			console.error('gemini Transcription error:', error);
		}
		
	}
			
    
    return {init, stop, start, isBusy}
}

