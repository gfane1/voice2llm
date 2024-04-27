import {useState, useRef, useEffect} from 'react'
export default function useWebSpeechTts({onReady, forceRefresh}) {
    const [isBusy, setIsBusy] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
	const [availableVoices, setAvailableVoices] = useState([]);
	let isTextToSpeechEnabled = "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
    //console.log(isTextToSpeechEnabled ? "WS TTS ENABLED" : "WS TTS DISABLED")
    let speechSynth = window.speechSynthesis;
    //synth.addEventListener("end", () => {
	useEffect(function() {
		if (isTextToSpeechEnabled)  {
			//console.log("voiceschanged init")
			speechSynth.getVoices()
		}
	},[])  
	//});
	speechSynth.addEventListener("voiceschanged", (e) => {
		//console.log("voiceschanged",e)
		let v = speechSynth.getVoices()
		//console.log("voiceschanged VV",v)
		if (v && v.length > 0) {
			let enVoices = v.filter(function(voice) {return (voice.lang === 'en') })
			//console.log("voiceschanged en",enVoices)
			setAvailableVoices(enVoices.map(function(voice) {return voice ? voice.name : ''}))
			forceRefresh()
			if (onReady) {onReady()}
		}
	});
    
	function speak(text, pitch = 1, rate = 1, selectedVoiceIndex=0) {
		return new Promise(function(resolve,reject) {
			if (isTextToSpeechEnabled)  {
				setIsBusy(true)
				let utterance = new SpeechSynthesisUtterance(text);
				utterance.voice = speechSynth.getVoices()[selectedVoiceIndex];
				utterance.pitch = pitch;
				utterance.rate = rate;
				speechSynth.speak(utterance);
				setIsBusy(false)
				setIsSpeaking(true)
				utterance.addEventListener("end",() => {
					setIsSpeaking(false)
					resolve()
				})
				utterance.addEventListener("error",() => {
					setIsSpeaking(false)
					resolve()
				})
			} else {
				resolve()
			}
		})
    }
    
    function stop() {
		if (isTextToSpeechEnabled) {
			setIsSpeaking(false)
			speechSynth.cancel()
		}
	}

		
    
    return {isBusy, isSpeaking, availableVoices, speak, stop}
}

