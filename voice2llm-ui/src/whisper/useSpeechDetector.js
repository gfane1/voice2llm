import hark from 'hark'
import {useEffect, useRef, useState} from 'react'

export default function useSpeechDetector({onSpeech, onStopSpeech})  {

	const [isSpeaking, setIsSpeaking] = useState(false)
	const isInitialised = useRef(false)
	
	useEffect(function() {
		if (!isInitialised.current) {
			isInitialised.current = true
			
			var getUserMedia = navigator.getUserMedia || 
			navigator.mozGetUserMedia || 
			navigator.webkitGetUserMedia;
		 
			if (getUserMedia) {
				getUserMedia = getUserMedia.bind(navigator);
			} else {
				console.log("Failed get user media")
				// have to figure out how to handle the error somehow
			}
		 
			getUserMedia(// media constraints
				{video: false, audio: true}, 
				// success callback
				function (stream) {
					// gets stream if successful
					var options = {interval: 100, threshold:-60};
					var speechEvents = hark(stream, options);
				 
					speechEvents.on('speaking', function() {
					  if (onSpeech) onSpeech()
					  setIsSpeaking(true)
					});
				 
					speechEvents.on('stopped_speaking', function() {
					  if (onStopSpeech) onStopSpeech()
					  setIsSpeaking(false)
					});
				}, 
				// error callback
				function (error) {
					console.log(error)
				}
			)
		}	
	},[])	
	
	return {isSpeaking}
}
