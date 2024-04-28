import {useState, useRef, useEffect	} from 'react'
import { WaveFile } from 'wavefile';
import nlp from 'compromise'
import useUtils from './useUtils'

export default function useSelfHostedLlm({onUpdate, onComplete, onReady, onStart}) {
    const [isBusy, setIsBusy] = useState(false);
    //const aiKey = useRef('')
    
    let utils = useUtils()
    let message  = useRef('')
	let urlRef = useRef('')
    let socket = useRef()
    let isSocketLoading = useRef(false)
	let sentCount = useRef(0)
	let modelType = useRef()
		
	function onMessage(e) {
		//console.log('ON SH MESSAGE',e.data)
		try {
			let j = JSON.parse(e.data)
			//console.log(j)
			if (j.token) {
				message.current = message.current + j.token
				let clauses = nlp(message.current).clauses().out('array')
				//console.log(clauses,sentCount.current)
				if (clauses.length -1 > sentCount.current) {
					//console.log('UPDATE',clauses)
					sentCount.current = sentCount.current > 0 ? sentCount.current + 1 : 1
					onUpdate(clauses[clauses.length - 2],clauses.slice(0,-1).join(" "),sentCount.current)
				}
			} else if (j.finished) {
				//message.current = message.current + j.token
				let clauses = nlp(message.current).clauses().out('array')
				//console.log("FIN",sentCount.current,clauses.length, clauses)
				let toSend = clauses.slice(sentCount.current,clauses.length - sentCount.current + 1).join(' ')
				//console.log("FIN to send",toSend)
				
				//console.log(clauses,sentCount.current)
				sentCount.current = sentCount.current > 0 ? sentCount.current + 1 : 1
				onUpdate(toSend,message.current,sentCount.current )
				onComplete(message.current,sentCount.current )
				message.current = ''
				sentCount.current = 0
				setIsBusy(false)
			}
		} catch (e) {}
		// call onUpdate, onComplete, onReady
	}
	

	function socketIsReady() {
		return socket.current && socket.current.readyState == 1
	}

	function getSocket() {
		//console.log("GET SOCKET llm ",urlRef.current)
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
						setIsBusy(false)
					};
					socket.onmessage = event => {
						//console.log('WebSocket event',event);
						onMessage(event)
					};
					socket.onerror = function(e) {
						console.log("WebSocket ERROR",e)
						setIsBusy(false)
						resolve()
					}
				} catch(e){console.log('error:', e);}
			}
			//return socket.current
		})
	}
	
	

	
	function start(systemMessage, chatHistory) {
		if (onStart) onStart()
		//console.log("ai start",chatHistory)
		setIsBusy(true)
		sentCount.current = 0
		getSocket().then(function(socket) {
			if (chatHistory && chatHistory.length > 0) socket.send(JSON.stringify({query: utils.renderPrompt(modelType.current, systemMessage, chatHistory)}))
		})
	}
	
    
    
	function stop() {
		let ready = socketIsReady(socket)
		//console.log("sh llm stop", ready)
		getSocket().then(function(socket) {
			socket.send(JSON.stringify({stop: true}))
		})
		
		setIsBusy(false)
	}
    
    
	function init(url, nmodelType) {
		console.log("sh init",url, nmodelType)
		urlRef.current = url
		modelType.current = nmodelType
		getSocket().then(function(newSocket) {socket.current = newSocket})
		//aiKey.current = openAIKey
	}
	

			
    
    return {init, stop, start, isBusy}
}
