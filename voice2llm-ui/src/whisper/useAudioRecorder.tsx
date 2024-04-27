import { useState, useEffect, useRef } from "react";
import RecordRTC from 'recordrtc'
import useSpeechDetector from './useSpeechDetector'

function blobToBase64(blob) {
	return new Promise((resolve, reject) => {
		if (!blob) resolve('')
		const reader = new FileReader();
		reader.readAsDataURL(blob);
		reader.onload = () => {
			const base64String = reader.result.split(',')[1];
			resolve('data:audio/wav;base64,'+base64String);
		};
		reader.onerror = (error) => reject(error);
	});
}

function getMimeType() {
	//return "audio/wav"
    const types = [
        "audio/webm",
        "audio/mp4",
        "audio/ogg",
        "audio/wav",
        "audio/aac",
    ];
    for (let i = 0; i < types.length; i++) {
        if (MediaRecorder.isTypeSupported(types[i])) {
			//console.log('use type '+types[i])
            return types[i];
        }
    }
    //console.log('use type undefined')
    return undefined;
}

export default function useAudioRecorder({config, onRecordingComplete, onRecordingStarted, onRecordingStopped, onReady, onDataAvailable}) {
    const [recording, setRecording] = useState(false);
    const [duration, setDuration] = useState(0);
    const [recordedData, setRecordedData] = useState<Blob | null>(null);
    
	//console.log("AR",config)
    //const streamRef = useRef<MediaStream | null>(null);
    //const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    let recorder = null
    const chunksRef = useRef<Blob[]>([]);
	const preChunksRef = useRef<Blob[]>([]);
    const audioRef = useRef<HTMLAudioElement | null>(null);

	let noSpeechTimeout = null
	let microphoneContext 
	let microphoneGainNode
	
	let configRef = useRef()
	
	const haveSpeech = useRef(false)
	const isEnabled = useRef(false)
	const isInitialised = useRef(false)
	
	function resetNoSpeechTimeout() {
		return
		//console.log('TIMEOUT reset')
		clearTimeout(noSpeechTimeout)
		noSpeechTimeout = setTimeout(function() {
			//console.log('TIMEOUT')
			//stopRecording()
		},3000)
	}
	
	useEffect(function() {
		//console.log('config change',JSON.stringify(config))
		if (config) configRef.current = JSON.parse(JSON.stringify(config))
	},[JSON.stringify(config)])

	const speechDetector = useSpeechDetector({
		onSpeech: function() {
			//console.log("speak")
			//resetNoSpeechTimeout()
			haveSpeech.current = true
		},
		onStopSpeech: function() {
			//console.log("stop speak")
			if (isEnabled.current) stopRecording()
		}
	})
	
    const startRecording = async (forceHaveSpeech) => {
		//console.log("start rec")
		if (!isInitialised.current) {
			//console.log("start rec first init")
			await init()
			
		}
		preChunksRef.current = [];
		chunksRef.current = [];
		isEnabled.current = true
		setRecording(true)
		haveSpeech.current = !!forceHaveSpeech
		//console.log("start rec done ")
		if (onRecordingStarted) onRecordingStarted()
	}
	
	function combineWavBlobs(blobs) {
		return new Promise(function(resolve,reject) {
			var type='audio/wav'
			var buffers = [];

			var index = 0;

			function readAsArrayBuffer() {
				if (!blobs[index]) {
					return concatenateBuffers();
				}
				var reader = new FileReader();
				reader.onload = function(event) {
					buffers.push(event.target.result);
					index++;
					readAsArrayBuffer();
				};
				reader.readAsArrayBuffer(blobs[index]);
			}

			readAsArrayBuffer();


			function audioLengthTo32Bit(n) {
				n = Math.floor(n);
				var b1 = n & 255;
				var b2 = (n >> 8) & 255;
				var b3 = (n >> 16) & 255;
				var b4 = (n >> 24) & 255;
			 
				return [b1, b2, b3, b4];
			}
			
			function concatenateBuffers() {
				var byteLength = 0;
				buffers.forEach(function(buffer) {
					byteLength += buffer.byteLength;
				});

				var tmp = new Uint8Array(byteLength);
				var lastOffset = 0;
				var newData;
				buffers.forEach(function(buffer) {
					if (type=='audio/wav' && lastOffset >  0) newData = new Uint8Array(buffer, 44);
					else newData = new Uint8Array(buffer);
					tmp.set(newData, lastOffset);
					lastOffset += newData.length;
				});
				if (type=='audio/wav') {
					tmp.set(audioLengthTo32Bit(lastOffset - 8), 4);
					tmp.set(audioLengthTo32Bit(lastOffset - 44), 40); // update audio length in the header
				}
				var blob = new Blob([tmp.buffer], {
					type: type
				});
				resolve(blob);         
				
			}
		})
    }
	function calculateAudioDuration(blob) {
		  return new Promise((resolve, reject) => {
			const audio = new Audio();
			const objectURL = URL.createObjectURL(blob);
			
			audio.addEventListener('loadedmetadata', function() {
			  const duration = audio.duration;
			  URL.revokeObjectURL(objectURL);
			  resolve(duration);
			});

			audio.addEventListener('error', function(err) {
			  URL.revokeObjectURL(objectURL);
			  reject(err);
			});

			audio.src = objectURL;
		  });
	}
	const finaliseRecording = async (config) => {
		//console.log(haveSpeech.current,chunksRef.current.length)
		//console.log("AR F",configRef.current)
		if (haveSpeech.current && chunksRef.current.length > 0) {    
			// Received a stop event
			let blob = await combineWavBlobs(chunksRef.current)
			blobToBase64(blob).then(function(b64) {
				setRecordedData(b64);
			})
			
			
			const fileReader = new FileReader();
			fileReader.onloadend = async () => {
				const audioCTX = new AudioContext({
					sampleRate: 16000
				});
				const arrayBuffer = fileReader.result as ArrayBuffer;
				//console.log(arrayBuffer)
				const decoded = await audioCTX.decodeAudioData(arrayBuffer);
				//console.log("AR FS",configRef.current, decoded)
				if (onRecordingComplete) {
					calculateAudioDuration(blob).then(function(duration) {
						onRecordingComplete(duration, blob, decoded, configRef.current);
					})
				}
			};
			fileReader.readAsArrayBuffer(blob);
		}	
		
	
	}
	
	const stopRecording = () => {
		//console.log("stop rec", config)
		isEnabled.current = false
		setRecording(false)
		if (onRecordingStopped) onRecordingStopped()
		finaliseRecording(JSON.stringify(config)).then(function() {
			chunksRef.current = [];
			preChunksRef.current = [];
		})
    };
	


	function handleDataAvailable(d) {
		//console.log('hd',isEnabled.current?'true':'false',onDataAvailable)
		if (onDataAvailable && isEnabled.current) {
			onDataAvailable(d)
		}	
			
		if (!isEnabled.current) {
			preChunksRef.current.push(d);
			// capture audio for 200ms before actual start to avoid losing words at beginning of sentence
			if (preChunksRef.current.length > 2) {
				preChunksRef.current.shift()
			}
			//console.log("B",d)
		} else {
			// push from prechunks to chunks
			for (let chunk in preChunksRef.current) {
				chunksRef.current.push(preChunksRef.current[chunk]);
			}
			preChunksRef.current = [];
			if (d.size > 0) {
				chunksRef.current.push(d)
			}
			//console.log("C",d)
		}
	}
	
	
	function init() {
		//console.log("rec init")
		if (isInitialised.current) return
		return new Promise(function(resolve,reject) {
			navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
				//console.log("create rec")
				recorder = RecordRTC(stream, {
					type: 'audio',
					recorderType: RecordRTC.StereoAudioRecorder,
					mimeType: 'audio/wav',
					timeSlice: 500,
					desiredSampRate: 16000,
					numberOfAudioChannels: 1,
					ondataavailable: handleDataAvailable
				});
				recorder.startRecording()
				isInitialised.current = true
				if (onReady) onReady()
				resolve()
			})
		})
	}
	

    const handleToggleRecording = () => {
        if (isEnabled.current && recording) {
            stopRecording();
        } else {
            startRecording();
        }
    };

    return {startRecording, stopRecording, recording, handleToggleRecording, isSpeaking: speechDetector.isSpeaking, init, isEnabled, isInitialised, recordedData}
}
