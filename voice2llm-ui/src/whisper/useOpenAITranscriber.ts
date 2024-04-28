import {useState, useRef	} from 'react'
import { WaveFile } from 'wavefile';

export default function useOpenAITranscriber({aiUsage, onUpdate, onComplete, onReady}): Transcriber {
    const [transcript, setTranscript] = useState('')
    const [isBusy, setIsBusy] = useState(false);
    const aiKey = useRef('')
    
	function init(openAIKey) {
		aiKey.current = openAIKey
		if (onReady) onReady()
	}
	
	function feed(data) {
	}
	
	function start(data, duration) {
		setIsBusy(true)
		//console.log('START WST',data)
		const formData = new FormData();
		formData.append('file', new File([data],'transcribe_me.wav'));
		formData.append('model', 'whisper-1');
		try {
			fetch('https://api.openai.com/v1/audio/transcriptions', {
				method: 'POST',
				headers: {
					'Authorization': 'Bearer '+aiKey.current,
				},
				body: formData
			}).then(function(response) {

				if (!response.ok) {
					throw new Error('Failed to transcribe audio');
				}
				aiUsage.logSTT({seconds: duration, key: aiKey.current, model:'whisper-1'})
					
				response.json().then(function(data) {
					if (data && data.text && onComplete) {
						setTranscript(data.text)
						onComplete(data.text)
					}
				})
			})
		} catch (error) {
			console.error('Transcription error:', error);
		}
		setIsBusy(false)
	}
			
    
    return {init, feed, start, isBusy, transcript}
}

