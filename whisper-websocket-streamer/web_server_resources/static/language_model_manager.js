///* global window */


let LanguageModelManager = function(config) {
	
	let socket
	
	function socketIsReady(socket) {
		return socket && socket.readyState == 1
	}

	function getSocket(config) {
		if (socketIsReady(socket)) return socket
		
		// Set up a WebSocket connection here...
		try{
			socket=new WebSocket(config.url)
			//console.log(socket)
		} catch(e){console.log('error:', e);}
		
		socket.onopen = () => {
			console.log('WebSocket connection opened');
			if (config.onOpen) config.onOpen()
		};

		socket.onclose = () => {
			console.log('WebSocket connection closed');
			if (config.onClose) config.onClose()
		};
		socket.onmessage = event => {
			//console.log('WebSocket event',event);
			if (config.onMessage) config.onMessage(event)
			
		};
		socket.onerror = function(e) {
			console.log("WebSocket ERROR",e)
			if (config.onError) config.onError(event)
		}
		return socket
	}
	
	socket = getSocket(config)
	
	function send(text, context='') {
		try {
			if (!socketIsReady(socket)) {
				socket = getSocket(config)
			}
			if (text) socket.send(JSON.stringify({context: context, query: text}))
		} catch (e) {
			console.log(e)	
		}
	}
	
	function continue_dialog() {
		send('continue')
	}
	
	function stop() {
		if (!socketIsReady(socket)) {
			socket = getSocket(config)
		}
		socket.send(JSON.stringify({stop: true}))
	}
	
	return {send, stop, getSocket, continue_dialog}
}

window.LanguageModelManager = LanguageModelManager
