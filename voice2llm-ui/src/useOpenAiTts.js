import {useState, useRef	} from 'react'
export default function useOpenAiTts({aiUsage}) {
    const [isBusy, setIsBusy] = useState(false);

	function blobToBase64(blob) {
	  // Converting blob to base64
	  return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onloadend = () => resolve(reader.result);
		reader.onerror = reject;
		reader.readAsDataURL(blob);
	  });
	}

	function speak(key, text, voice='alloy') {
		return new Promise(function(resolve,reject) {
			if (!text) resolve() 
			//console.log("aitts start", key, text, voice)
			setIsBusy(true)
			let formData = {
				model: 'tts-1',
				input: text,
				voice: voice
			}
			
			try {
				fetch('https://api.openai.com/v1/audio/speech', {
					method: 'POST',
					headers: {
						'Authorization': 'Bearer '+key,
						'Content-Type': 'application/json'
					},
					body: JSON.stringify(formData),
				}).then(function(response) {
					//console.log("ai response",response)
					if (!response.ok) {
						throw new Error('Failed to generate audio');
					}
					aiUsage.logTTS({letters: text.length, key: key, model:'tts-1'})
					response.blob().then(function(data) {
						blobToBase64(data).then(function(b64) {
							setIsBusy(false)
							resolve(b64)
						})
					})
					
				})
			} catch (error) {
				console.error('Speech generateion error:', error);
				resolve()
			}
		})
		
	}
			
    
    return {speak}
}

