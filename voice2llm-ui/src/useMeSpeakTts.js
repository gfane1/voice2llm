import {useState, useRef, useEffect} from 'react'

const meSpeak = window.meSpeak
	
export default function useMeSpeakTts({onReady}) {
    const [isBusy, setIsBusy] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
	
	useEffect(function() {
		//console.log("loadvoices")
		meSpeak.loadVoice('voices/en/en-us.json')
	},[])
	function speak(text, pitch = 1, rate = 1, selectedVoiceIndex=0) {
		return new Promise(function(resolve,reject) {
			setIsSpeaking(true)
			meSpeak.speak(text,{callback: function(e) { setIsSpeaking(false); resolve()}})
		})
    }
    
    function stop() {
		//console.log('speak stop')
		if (meSpeak) {
			setIsSpeaking(false)
			meSpeak.stop()
		}
	}

		
    
    return {isBusy, isSpeaking, speak, stop}
}

