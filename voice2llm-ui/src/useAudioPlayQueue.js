import {useRef, useState, useEffect} from 'react'

export default function useAudioPlayQueue({onStopPlaying, onStartPlaying, onFinishedPlaying, onError}) {
	let PLAYBACK_RATE=1
	let [isPlaying, setIsPlaying] = useState(false)
	let urlAudioPlayer = useRef()
	let playQueue=useRef([])
	const [isMuted, setIsMuted] = useState(false)
	
	function mute() {
		//console.log('MUTE')
		setIsMuted(true)
		if (urlAudioPlayer.current) {
			urlAudioPlayer.current.volume = 0
		}
	}
	
	function unmute() {
		//console.log('UNMUTE')
		setIsMuted(false)
		if (urlAudioPlayer.current) urlAudioPlayer.current.volume = 1
	}
		
	function stopPlaying() {
		//console.log('STOP PLAY',urlAudioPlayer.current)
		if (onStopPlaying) onStopPlaying()
		setIsPlaying(false)
		playQueue.current = []
		if (urlAudioPlayer.current) {
			urlAudioPlayer.current.pause()
		}
	};
	
	function playUrl(url) {
		//console.log('PLAY',url)
		return new Promise(function(resolve,reject) {
			if (isPlaying.current && playQueue.current) {
				playQueue.current.push(url)
			} else {
				setIsPlaying(true)
				urlAudioPlayer.current = new Audio(url);
				urlAudioPlayer.current.playbackRate = PLAYBACK_RATE
				urlAudioPlayer.current.volume = isMuted ? 0 : 1
				urlAudioPlayer.current.addEventListener("canplaythrough", event => {
				  /* the audio is now playable; play it if permissions allow */
				  //console.log('PLAY audio loaded')
				  if (onStartPlaying) onStartPlaying()
				  setIsPlaying(true)
				  urlAudioPlayer.current.play();
				});
				urlAudioPlayer.current.addEventListener("ended", event => {
					//console.log("PLAY ENDED", playQueue.current)
					if (playQueue.current.length > 0) {
						//console.log("PLAY ENDED NEXT")
						urlAudioPlayer.current.src = playQueue.current.pop()
						urlAudioPlayer.current.pause()
						urlAudioPlayer.current.load()
						urlAudioPlayer.current.playbackRate = PLAYBACK_RATE
						setTimeout(function() {
							if (onStartPlaying) onStartPlaying()
							urlAudioPlayer.current.play()
						},300)
						//resolve()
						
					} else {
						//console.log("PLAY ENDED all doNE")
						setIsPlaying(false)
						if (onFinishedPlaying) onFinishedPlaying()
						resolve()
					}
				})
				urlAudioPlayer.current.addEventListener("error", event => {
					console.log("PLAY error",event)
					setIsPlaying(false)
					if (onError) onError(event)
					resolve()
				})
			}
		})
	}
	
	return {mute, unmute, stopPlaying, playUrl, isPlaying,setIsPlaying, isMuted}	
}
