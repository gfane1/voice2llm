import {React, useEffect, useState} from 'react'  
import useHotwordManager from './hotword/useHotwordManager'
import {useLocalTranscriber} from './whisper/useLocalTranscriber.ts'
import useWebsocketTranscriber from './whisper/useWebsocketTranscriber.ts'
import useOpenAITranscriber from './whisper/useOpenAITranscriber.ts'

import useAudioRecorder from './whisper/useAudioRecorder.tsx'
import {Button, Modal} from 'react-bootstrap'
import useIcons from './useIcons'  
import useIsOnline from './useIsOnline'  
  
export default function SpeechButton(props) {
	//console.log("SBC",props.config)
	let useOpenAi = (props.config && props.config.stt && props.config.stt.use === "openai" && props.config.stt.openai_key)? true : false
	let useSelfHosted = (props.config && props.config.stt && props.config.stt.use === "self_hosted" && props.config.stt.self_hosted_url)? true : false
	let useLocal = (props.config && props.config.stt && props.config.stt.use === "local" && props.config.stt.local_whisper_model) ? true : false
	let useHotword = (props.config && props.config.stt && props.config.stt.use_hotword)? true : false
		
	//useEffect(function() {
		////console.log("SPEK CHNG",props.isSpeaking)
	//},[props.isSpeaking])
	
	const icons = useIcons()
	let onlineCheck = useIsOnline()
	let hotwordManager = useHotwordManager({
		porcupineWorkerScript:'./hotword/porcupine_worker.js',
		downsamplerScript:'./hotword/downsampling_worker.js',
		detectionCallback:function(e) {
			if (e && (useLocal || useSelfHosted || useOpenAi) ) {
				if (e + '' === "Hey Edison") {
					console.log("HW edison")
					if (props.stopLanguageModels) props.stopLanguageModels()
					audioRecorder.startRecording(true)
				}
				//console.log("HW"+e+"||")
			}
		}, 
		errorCallback:function(e) {console.log("HW err",e)}, 
	})
	
	let audioRecorder = useAudioRecorder({
		config: props.config,
		onRecordingComplete: function (duration, blob, data, config) {
			//console.log("REC COMPLETE",data,config)
			let useOpenAi = (config && config.stt && config.stt.use === "openai" && config.stt.openai_key)? true : false
			let useSelfHosted = (config && config.stt && config.stt.use === "self_hosted" && config.stt.self_hosted_url)? true : false
			let useLocal = (config && config.stt && config.stt.use === "local" && config.stt.local_whisper_model) ? true : false
			//console.log("REC COMPLETE",useLocal,useLocal,useSelfHosted,useOpenAi)
			if (useLocal) {
				//console.log("TSstart")
				localTranscriber.start(data)
			} else if (useSelfHosted) {
				//console.log("WS start")
				websocketTranscriber.start(data)
			} else if (useOpenAi) {
				//console.log("AI start")
				openAITranscriber.start(blob, duration)
			}
			//if (onlineCheck.isOnline) {
				//console.log("USE ONLINE ASR")
				//transcriber.start(data)
			//} else  {
				//transcriber.start(data)
			//}
			//hotwordManager.start()
		},
		onRecordingStarted: function() {
			//console.log("REC Start")
			hotwordManager.stop()
		},
		onRecordingStopped: function() {
			//console.log("REC Stop")
			if (useHotword) hotwordManager.start()
		},
		onReady: function() {
			//console.log("REC Ready")
			props.forceRefresh()
		},
		onDataAvailable: function(d) {
			//console.log("DATAAVAIL",d)
			if (useLocal) {
				//console.log("TSFEED")
				localTranscriber.feed(d)
			} else if (useSelfHosted) {
				//console.log("WSFEED")
				websocketTranscriber.feed(d)
			} else if (useOpenAi) {
				//console.log("WSFEED")
				openAITranscriber.feed(d)
			}
		}
	})
	
	let localTranscriber = useLocalTranscriber({
		whisperModel: props.config && props.config.stt && props.config.stt.local_whisper_model ? props.config.stt.local_whisper_model : '',
		onStart: function() {
			props.startWaiting()
		},
		onReady: function(v) {
			//console.log("wsTRANSCRIBER READY")
			audioRecorder.init()
		},
		onUpdate: function(v) {
			//console.log('U',v)
			if (props.onPartialTranscript) props.onPartialTranscript(v)
		},
		onComplete: function(v) {
			//console.log('C',v,props.config)
			if (props.onTranscript) props.onTranscript(v)
			props.stopWaiting()
			//if (props.allowRestart) audioRecorder.startRecording()
		},
		onError: function(e) {
			props.stopWaiting()
		}
	})
	
	let websocketTranscriber = useWebsocketTranscriber({
		onReady: function(v) {
			//console.log("wsTRANSCRIBER READY")
			audioRecorder.init()
		},
		onUpdate: function(v) {
			//console.log('U',v)
			if (props.onPartialTranscript) props.onPartialTranscript(v)
		},
		onComplete: function(v) {
			//console.log('C',v)
			if (props.onTranscript) props.onTranscript(v)
			//if (props.allowRestart) audioRecorder.startRecording()
		}
	})
	
	
	//let transcriber = localTranscriber;
	let openAITranscriber = useOpenAITranscriber({
		aiUsage: props.aiUsage,
		onReady: function(v) {
			//console.log("aiTRANSCRIBER READY")
			audioRecorder.init()
		},
		onUpdate: function(v) {
			//console.log('aiU',v)
			if (props.onPartialTranscript) props.onPartialTranscript(v)
		},
		onComplete: function(v) {
			//console.log('aiC',v)
			if (props.onTranscript) props.onTranscript(v)
			//if (props.allowRestart) audioRecorder.startRecording()
		}
	})
	
	useEffect(function() {
		if (useHotword) hotwordManager.start()
	},[])
	
	useEffect(function() {
		//console.log("CONF CHANGE",JSON.stringify(props.config))
		let useLocal = (props.config && props.config.stt && props.config.stt.use === "local" && props.config.stt.local_whisper_model)
		let useOpenAi = (props.config && props.config.stt && props.config.stt.use === "openai" && props.config.stt.openai_key)? true : false
		let useSelfHosted = (props.config && props.config.stt && props.config.stt.use === "self_hosted" && props.config.stt.self_hosted_url)? true : false
		if (useLocal) {
			//console.log("CONF CHANGE LL")
			localTranscriber.init("Xenova/whisper-"+props.config.stt.local_whisper_model)
		} else if (useSelfHosted) {
			//console.log("CONF CHANGE SH",props.config.stt.self_hosted_url)
			websocketTranscriber.init(props.config.stt.self_hosted_url)
		} else if (useOpenAi) {
			//console.log("CONF CHANGE AI",props.config.stt.openai_key)
			openAITranscriber.init(props.config.stt.openai_key)
		}
		
	},[JSON.stringify(props.config)])
	
	//[((props.config && props.config.stt && props.config.stt.use )  ? props.config.stt.use : ''),((props.config && props.config.stt && props.config.stt.local_whisper_model) ? props.config.stt.local_whisper_model : '')])
	
	useEffect(function() {
		//console.log("CONF CHANGE hw",JSON.stringify(props.config))
		let useHotword = (props.config && props.config.stt && props.config.stt.use_hotword)
		if (useHotword) {
			//console.log("CONF CHANGE hotword start")
			hotwordManager.start()
		} else {
			hotwordManager.stop()
		}
	},[(props.config && props.config.stt && props.config.stt.use_hotword )])

	
	/* button COLORS
	  grey - not available, not activated
	* red (with line) - recording
	* green - online available, 
	* blue - offline available
	*/
		
	let useOnline = (useOpenAi || useSelfHosted) && onlineCheck.isOnline
	
	const buttonStyleSending = {borderRadius:'35px',color:'black', backgroundColor:'#dc3545', border: '2px solid '+(audioRecorder.isSpeaking ? 'pink' : 'darkred')}
	const buttonStyleOnline = {borderRadius:'35px',color:'black', backgroundColor:'#198754', border: '2px solid '+(audioRecorder.isSpeaking ? 'lightgreen' : 'darkgreen')}
	const buttonStyleLocal = {borderRadius:'35px',color:'black', backgroundColor:'#0b5ed7', border: '2px solid '+(audioRecorder.isSpeaking ? 'lightblue' : 'darkblue')}
	const buttonStyleLoading = {borderRadius:'35px',color:'black', backgroundColor:'grey', border: '2px solid '+(audioRecorder.isSpeaking ? 'lightgrey' : 'darkgrey')}
	
	let buttonStyle
	let onClick = audioRecorder.handleToggleRecording
	//console.log('SB',useOpenAi, useSelfHosted, useLocal, transcriber.isBusy, transcriber.isModelLoading, audioRecorder.isInitialised.current)
	
	if (((!useOpenAi && !useSelfHosted && !useLocal) || websocketTranscriber.isBusy || openAITranscriber.isBusy || localTranscriber.isBusy || localTranscriber.isModelLoading || !audioRecorder.isInitialised.current)) {
		buttonStyle = buttonStyleLoading
		if (websocketTranscriber.isBusy || openAITranscriber.isBusy || localTranscriber.isBusy) {
			// TODO FORCE STOP TRANSCRIPTION NOW AND/OR AT LEAST STAY STOPPED
			onClick = function() {audioRecorder.stopRecording()}
		} else {
			onClick = function() {}
		}
	} else {
		if (audioRecorder.isEnabled.current) { 	
			buttonStyle = buttonStyleSending
		} else {
			if (useOnline) {
				buttonStyle = buttonStyleOnline
			} else {
				buttonStyle = buttonStyleLocal
			}
		}
		if (useHotword) buttonStyle.color="white"
	}
	
	 //"#dc3545" 
	return <>
	<Button style={buttonStyle}  onClick={onClick}  >{(websocketTranscriber.isBusy || openAITranscriber.isBusy || localTranscriber.isBusy || localTranscriber.isModelLoading) ? icons['loader-line'] : (audioRecorder.isEnabled.current) ? icons['mic-off-fill'] : icons['mic-fill']}</Button>
	</>;
}
