import {useState, useRef	} from 'react'
import { WaveFile } from 'wavefile';

export default function useWebsocketTranscriber({onUpdate, onComplete, onReady}): Transcriber {
    const [transcript, setTranscript] = useState<TranscriberData | undefined>(
        undefined,
    );
    const [isBusy, setIsBusy] = useState(false);
    
    const [output, setOutput] = useState('')
    let urlRef = useRef('')
    let socket = useRef()
    let isSocketLoading = useRef(false)
	
	
	function socketIsReady() {
		return socket.current && socket.current.readyState == 1
	}

	function getSocket() {
		//console.log("GET SOCKET ",urlRef.current)
		return new Promise(function(resolve,reject) {
			if (socketIsReady(socket.current)) resolve(socket.current)
			if (!isSocketLoading.current) {
				// Set up a WebSocket connection here...
				try{
					isSocketLoading.current = true
					let socket=new WebSocket(urlRef.current)
					//console.log(socket)
					
					socket.onopen = () => {
						//console.log('WebSocket connection opened');
						if (onReady) onReady()
						resolve(socket)
					};

					socket.onclose = () => {
						//console.log('WebSocket connection closed');
					};
					socket.onmessage = event => {
						//console.log('WebSocket event',event);
						onMessage(event)
					};
					socket.onerror = function(e) {
						//console.log("WebSocket ERROR",e)
						resolve()
					}
				} catch(e){console.log('error:', e);}
			}
			//return socket.current
		})
	}
	
	
	function onMessage(e) {
		//console.log('ONMESSAGE',e)
		try {
			let j = JSON.parse(e.data)
			if (j.transcription) {
				onComplete(j.transcription)
			}
		} catch (e) {}
		// call onUpdate, onComplete, onReady
	}
	
	
	function init(url) {
		//console.log('INIT WST',url, onReady)
		urlRef.current = url
		getSocket().then(function(newSocket) {socket.current = newSocket})
	}
		
	async function blobToPCM(blob) {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();

			reader.onload = function(event) {
				const arrayBuffer = event.target.result;
				const noHeader = new Uint16Array(arrayBuffer, 44)
				resolve(noHeader);
			};

			reader.onerror = function(event) {
				reject(event.target.error);
			};

			reader.readAsArrayBuffer(blob);
		});
	}
	
	function feed(data) {
		//console.log('FEED WST',data, socket.current)
		getSocket().then(function(socket) {
			blobToPCM(data).then(function(e) {
				socket.send(e)
			})
		})
	}
	
	function start(data) {
		//console.log('START WST',data, socket.current)
		getSocket().then(function(socket) {
			socket.send(null)
		})
	}
	
    
    return {init, feed, start, output, isBusy, transcript}
}

