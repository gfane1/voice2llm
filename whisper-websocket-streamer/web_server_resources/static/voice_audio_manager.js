///* global window */


let VoiceAudioManager = function(config) {
	
	let isMuted = false
	let AudioContext,
    processor,
    input,
    context,
    globalStream
	let socket;
	let isPlaying = false
	let bufferSource
	let urlAudioPlayer
	let playTime
	let playQueue = []
	const PLAYBACK_RATE = 0.9
	
	//console.log(Object.keys(that))

	function downsampleBuffer (buffer, sampleRate, outSampleRate) {
		if (outSampleRate == sampleRate) {
		  return buffer;
		}
		if (outSampleRate > sampleRate) {
		  throw 'downsampling rate show be smaller than original sample rate';
		}
		var sampleRateRatio = sampleRate / outSampleRate;
		var newLength = Math.round(buffer.length / sampleRateRatio);
		var result = new Int16Array(newLength);
		var offsetResult = 0;
		var offsetBuffer = 0;
		while (offsetResult < result.length) {
		  var nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
		  var accum = 0,
			count = 0;
		  for (var i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
			accum += buffer[i];
			count++;
		  }
	  
		  result[offsetResult] = Math.min(1, accum / count) * 0x7fff;
		  offsetResult++;
		  offsetBuffer = nextOffsetBuffer;
		}
		return result.buffer;
	}

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
			startAudio()
		};

		socket.onclose = () => {
			console.log('WebSocket connection closed');
			if (config.onClose) config.onClose()
			stop()
		};
		socket.onmessage = event => {
			console.log('WebSocket event',event);
			if (config.onMessage) config.onMessage(event)
			
		};
		socket.onerror = function(e) {
			console.log("WebSocket ERROR",e)
			if (config.onError) config.onError(event)
			stop()
			setTimeout(function() {
				start()
			}, 10000)
		}
		return socket
	}
	
	

	function startAudio() {
		console.log('start audio')
		AudioContext = window.AudioContext || window.webkitAudioContext;
		context = new AudioContext({
		  // if Non-interactive, use 'playback' or 'balanced' // https://developer.mozilla.org/en-US/docs/Web/API/AudioContextLatencyCategory
		  latencyHint: 'interactive',
		});
		let bufferSize = 4096*4
		processor = context.createScriptProcessor(bufferSize, 1, 1);
		processor.connect(context.destination);
		context.resume();
	  
		var handleSuccess = function (stream) {
			globalStream = stream;
			var options = {};
			var speechEvents = hark(stream, options);

			speechEvents.on('speaking', function() {
			  console.log('speaking');
			  if (config.onSpeech) config.onSpeech()
			});

			speechEvents.on('stopped_speaking', function() {
			  console.log('stopped_speaking');
			  if (config.onSpeech) config.offSpeech()
			});

			input = context.createMediaStreamSource(stream);
			input.connect(processor);

			processor.onaudioprocess = function (e) {
				var left = e.inputBuffer.getChannelData(0);
				var left16 = downsampleBuffer(left, 44100, 16000);
				//console.log(left16)
				//if (socket && socket.readyState == 1 && isSending) 
				if (!isPlaying) socket.send(left16);
			};
		}
	  
		navigator.mediaDevices.getUserMedia({audio: true, video: false}).then(handleSuccess);
	}
	
	function start() {
		console.log('vam start')
		// ensure socket connection
		if (config.onStart) config.onStart()
		if (socketIsReady(socket)) {
			startAudio()
		} else {
			// rely on onOpen to start audio
			socket = getSocket({
				url:config.url, 
				onMessage: config.onMessage
			})
		}
	} 
	
	function stop() {
		console.log('vam stop')
		if (config.onStop) config.onStop()
		if (socket) {
			socket.send(null);
			try {
				//socket.close()
			} catch (e) {}
		}
		try {
			let track = globalStream.getTracks()[0];
			track.stop();
		} catch (e) {}
	  
		if (input) input.disconnect(processor);
		if (processor) processor.disconnect(context.destination);
		if (context) context.close().then(function () {
		  input = null;
		  processor = null;
		  context = null;
		  AudioContext = null;
		});
		
	} 
	
	
	function mute() {
		console.log('MUTE')
		isMuted = true
		if (urlAudioPlayer) {
			urlAudioPlayer.volume = 0
		}
	}
	
	function unmute() {
		isMuted = false
		if (urlAudioPlayer) urlAudioPlayer.volume = 1
	}
		
	function stopPlaying() {
		console.log('STOP PLAY')
		if (config.onStopPlaying) config.onStopPlaying()
		isPlaying = false
		playQueue = []
		if (urlAudioPlayer) {
			urlAudioPlayer.pause()
		}
	};
	
	function playUrl(url) {
		return new Promise(function(resolve,reject) {
			if (isPlaying) {
				playQueue.push(url)
			} else {
				isPlaying = true 
				urlAudioPlayer = new Audio(url);
				urlAudioPlayer.playbackRate = PLAYBACK_RATE
				urlAudioPlayer.volume = isMuted ? 0 : 1
				urlAudioPlayer.addEventListener("canplaythrough", event => {
				  /* the audio is now playable; play it if permissions allow */
				  if (config.onStartPlaying) config.onStartPlaying()
				  urlAudioPlayer.play();
				});
				urlAudioPlayer.addEventListener("ended", event => {
					console.log("ENDED", playQueue)
					if (playQueue.length > 0) {
						urlAudioPlayer.src = playQueue.pop()
						urlAudioPlayer.pause()
						urlAudioPlayer.load()
						urlAudioPlayer.playbackRate = PLAYBACK_RATE
						if (config.onStartPlaying) config.onStartPlaying()
						urlAudioPlayer.play()
						resolve()
						
					} else {
						isPlaying = false 
						if (config.onFinishedPlaying) config.onFinishedPlaying()
						resolve()
					}
				})
				urlAudioPlayer.addEventListener("error", event => {
					isPlaying = false
					if (config.onError) config.onError(event)
					resolve()
				})
			}
		})
	}    	

	
	return {start, stop, playUrl, stopPlaying, isPlaying, mute, unmute}
}

window.VoiceAudioManager = VoiceAudioManager
        //var PorcupineManager = require('./porcupine/porcupine_manager')
        
        //var KeywordData =  require('./porcupine/keyword_data_edison')
        //try {
            //window.PorcupineManager = PorcupineManager
        //} catch(e) {} 
          
        
        //var mqttClient = null;
        //var isRecording = false;
        //var isSending = false;
        //var isPlaying = false;
        //var waitingFor = {}
        //var onCallbacks = {}
        
        //var hotwordInitialised = false;
        //var hotwordStarted = false;
        //// default volumes
        //var inputvolume = 1.0  // TODO also hotword volume?
        //var outputvolume = 1.0
        //var hotwordReady = false;        
        //let audioContext = window.AudioContext || window.webkitAudioContext;
        //let microphoneContext = null
        //var microphoneGainNode = null;
        //let speakerContext = null
        //var speakerGainNode = null;
        //var urlAudioPlayer = null;                          
        //var porcupineManager;
        //var speakingTimeout = null;     
        //var speaking = false;
        //var microphoneAudioBuffer = []
        //var bufferSource = null;
        //var currentVolume = null;        
        //var speakerCache = []

        //var SENSITIVITIES = new Float32Array([
                //0.9 //, // "Hey Edison"
                ////0.5, // "Hot Pink"
                ////0.5, // "Deep Pink"
                ////0.5, // "Fire Brick"
                ////0.5, // "Papaya Whip"
                ////0.5, // "Peach Puff"
                ////0.5, // "Sandy Brown"
                ////0.5, // "Lime Green"
                ////0.5, // "Forest Green"
                ////0.5, // "Midnight Blue"
                ////0.5, // "Magenta"
                ////0.5, // "White Smoke"
                ////0.5, // "Lavender Blush"
                ////0.5 // "Dim Gray"
            //]);
        
        //var messageFunctions = {
            //'hermod/+/speaker/cache/+' : function(topic,site,payload) {
                //speakerCache.push(payload)
            //}, 
            //'hermod/+/speaker/play/+' : function(topic,site,payload) {
                //var parts = topic.split("/")
                //var uid = 'no_id'
                //if (parts.length > 4)  {
                    //uid = parts[4]
                //}
                //if (site && site.length > 0) { 
                    //var json = {}
                    //try {
                        //json = JSON.parse(payload)
                    //} catch(e) {}
                    //if (json && json.url) {
                        //if (onCallbacks.hasOwnProperty('startPlaying')) {
                            //onCallbacks['startPlaying']()
                         //} 
                         //playUrl(json.url).then(function() {
                            //mqttClient.publish("hermod/"+site+"/speaker/finished",JSON.stringify({"id":uid})); 
                            //if (onCallbacks.hasOwnProperty('stopPlaying')) {
                                //onCallbacks['stopPlaying']()
                            //} 
                        //}); 
                    //} else {
                        //mqttClient.publish("hermod/"+site+"/speaker/started",JSON.stringify({"id":uid})); 
                        //if (onCallbacks.hasOwnProperty('startPlaying')) {
                            //onCallbacks['startPlaying']()
                        //} 
                        //speakerCache.push(payload)
                        //playSound(concat_arrays(speakerCache)).then(function() {
                            //speakerCache = []
                            //mqttClient.publish("hermod/"+site+"/speaker/finished",JSON.stringify({"id":uid})); 
                            //if (onCallbacks.hasOwnProperty('stopPlaying')) {
                                //onCallbacks['stopPlaying']()
                             //} 
                        //}); 
                    //}
                //}
            //}, 

            //'hermod/+/nlu/intent': function(topic,site,payload) {
                //var json = JSON.parse(payload)
                //if (json && json.intent && json.intent.name) {
                    //var message = json.intent.name
                    //var entities = []
                    //if (json.entities) {
                        //for (var i in json.entities) {
                            //entities.push(json.entities[i].entity)
                        //}
                        //if (entities.length > 0) {
                            //message += '::'+entities.join("__")
                        //}
                    //}
                //}
            //},
            //'hermod/+/tts/say': function(topic,site,payload) {
              //if (onCallbacks.hasOwnProperty('startSpeaking')) {
                    //onCallbacks['startSpeaking']() 
                //}
            //}, 
            //'hermod/+/tts/finished': function(topic,site,payload) {
              //if (onCallbacks.hasOwnProperty('stopSpeaking')) {
                    //onCallbacks['stopSpeaking']() 
                //}
            //}, 
            
            //'hermod/+/speaker/volume': function(topic,site,payloadIn) {
                //// quarter volume for 10 seconds
                //var payload = {}
                //try {
                    //payload = JSON.parse(payloadIn)
                    //if (payload.volume) setVolume(payload.volume)
                //} catch(e) {
                    
                //}
            //} ,  
            //'hermod/+/asr/start' : function(topic,site,payload) {
                 //muteVolume()
                 //startMicrophone()
            //},
            //'hermod/+/asr/stop' : function(topic,site,payload) {
                //stopMicrophone()
                //unmuteVolume()
            //},
            //'hermod/+/hotword/start' : function(topic,site,payload) {
                //startHotword();
            //},
            //'hermod/+/hotword/stop' : function(topic,site,payload) {
                //stopHotword();
            //},
            //'hermod/+/ready' : function(topic,site,payload) {
                //console.log('reload on server restart')
                //sendInitMessage(site)
            //}        
        //}
        
        
         
        
        //function concat_arrays(arrays) {
            //// sum of individual array lengths
            //let totalLength = arrays.reduce((acc, value) => acc + value.length, 0);

            //if (!arrays.length) return null;
            //let result = new Uint8Array(totalLength);
            //// for each array - copy it over result
            //// next array is copied right after the previous one
            //let length = 0;
            //for(let array of arrays) {
                //result.set(array, length);
                //length += array.length;
            //}

            //return result;
        //}
        
        //function onMessageArrived(message,payload) {
            //if (waitingFor.hasOwnProperty(message)) {
                //// callback for sendAndWaitFor
                //mqttClient.unsubscribe(message)
                //waitingFor[message](message,payload)
                //delete waitingFor[message]
            //} else {
                //// handle messageFunction
                //var parts = message.split("/")
                //// special handling for id in speaker/play/<id>
                //if ((parts.length > 4 && parts[2] === "speaker" && parts[3] === "play") || (parts.length > 4 && parts[2] === "speaker" && parts[3] === "cache") || 
                //(parts.length > 4 && parts[2] === "speaker" && parts[3] === "stream_mp3") || (parts.length > 4 && parts[2] === "speaker" && parts[3] === "stream_wav")) {
                    //parts[4]="+";
                //}
                //var site = parts[1]
                //parts[1] = '+'
                //var multiSite = parts.join("/")
                //if (messageFunctions.hasOwnProperty(multiSite)) { 
                    //messageFunctions[multiSite](message,site,payload)
                //}
            //}
            //if (onCallbacks.hasOwnProperty('message')) {
                //onCallbacks['message'](message,payload)
            //}
        //}

        //function sendInitMessage(site) {
            //sendMessage('hermod/'+site+'/dialog/init',{"platform":"web","url":window.location.origin,"supports":["audio","display"]})
        //}
    
        //function connect() {
            
            //return new Promise(function(resolve,reject) {
                //function onConnect() {
                    //if (config.subscribe && config.subscribe.length  > 0) { 
                        //mqttClient.subscribe('hermod/rasa/ready',function(err) { 
                            //mqttClient.unsubscribe(config.subscribe,function(err) {
                               //if (err) console.log(['unSUBSCRIBE ERROR',err])
                                //mqttClient.subscribe(config.subscribe,function(err) {
                                   //if (err) console.log(['SUBSCRIBE ERROR',err])
                                   //sendMessage('hermod/'+config.site+'/asr/activate',{})
                                   //if (onCallbacks.hasOwnProperty('connect')) {
                                        //onCallbacks['connect']()
                                    //}
                                    //sendInitMessage(config.site)
                                   //resolve()
                                //});
                            //});
                        //});
                    //} else {
                        //sendInitMessage(config.site)
                        //if (onCallbacks.hasOwnProperty('connect')) {
                            //onCallbacks['connect']()
                        //}
                        //resolve()
                    //}
                //}
                //var options = {
                  //clientId: config.username,
                  //protocolId: 'MQTT',
                  //protocolVersion: 4,
                  //clean: false,
                  //username: config.username,
                  //password: config.password,
                  //rejectUnauthorized: false
                //}
                //var protocol = 'ws://'
                //var port = 9001
                //if (window.location.protocol == "https:") {
                    //protocol = 'wss://' 
                //}
                //var mqttServer = null;
                //if (config.server) {
                    //mqttServer = config.server
                //} else {
                    //mqttServer = protocol + window.location.hostname + ":"+port
                //}
                
                //mqttClient = mqtt.connect(mqttServer, options);
                
                //mqttClient.on('connect', onConnect)
                //mqttClient.on('error', function(e) {
                    //console.log('error')
                    //console.log(e)
                    //if (onCallbacks.hasOwnProperty('disconnect')) {
                        //onCallbacks['disconnect']()
                    //}
                //})
                //mqttClient.on('disconnect', function(e) {
                    //console.log('disconnect')
                    //console.log(e)
                    //if (onCallbacks.hasOwnProperty('disconnect')) {
                        //onCallbacks['disconnect']()
                    //}
                //})
                //mqttClient.on('reconnect', function(e) {
                    //console.log('reconnect')
                    //if (onCallbacks.hasOwnProperty('reconnect')) {
                        //onCallbacks['reconnect']() 
                    //}
                //})

                //mqttClient.on('message',onMessageArrived);
            //})
            
        //}
      
        //function disconnect() {
            //if (onCallbacks.hasOwnProperty('disconnect')) {
                //onCallbacks['disconnect']()
            //}
            //mqttClient.end()
            //setTimeout(function() {
                //connect()
            //},3000)
        //}
         
        //function sendMessage(topic,payload) {
            //mqttClient.publish(topic,JSON.stringify(payload));    
        //}
        
        //function sendNLUMessage(site,intent,entities) {
            //if (!entities) entities = []
            //mqttClient.publish('hermod/'+site+'/nlu/intent',JSON.stringify({intent:{name:intent}, entities:entities}));    
        //}
        
         
        //function sendASRTextMessage(site,text) {
            //mqttClient.publish('hermod/'+site+'/asr/text',JSON.stringify({text:text}));    
        //}
        
        
        //function sendAudioMessage(topic,payload) {
            //mqttClient.publish(topic,payload);    
        //}
        
        //function sendAndWaitFor(sendTopic,payload,waitTopic) {
            //return new Promise(function(resolve,reject) {
                //mqttClient.subscribe(waitTopic)
                //waitingFor[waitTopic] = function() {resolve()};
                //mqttClient.publish(sendTopic,JSON.stringify(payload));  
            //})
        //}
        
        //function say(text) {
            //return sendAndWaitFor('hermod/'+config.site+'/tts/say',{text:text},'hermod/'+config.site+'/tts/finished')
        //}
        
        //function sendAudioAndWaitFor(site,audio,waitTopic) {
            //return new Promise(function(resolve,reject) {
                //mqttClient.subscribe(waitTopic)
                //waitingFor[waitTopic] = function() {wav2mqtt.stop(); resolve()};
                //wav2mqtt.start(mqttClient,site,audio);  
            //})
        //}
        
        //function authenticate() {
            
        //}

        //function setVolume(volume) {
            //if (speakerGainNode && speakerGainNode.gain) speakerGainNode.gain.value = volume/100;
        //}
        
        //function muteVolume() {
            //if (speakerGainNode && speakerGainNode.gain) {
                //currentVolume = speakerGainNode.gain.value
                //speakerGainNode.gain.value = 0.05;
            //}
            
        //}
        
        //function unmuteVolume() {
            //if (currentVolume != null) {
                //if (speakerGainNode && speakerGainNode.gain) {
                    //speakerGainNode.gain.value = currentVolume;
                    //currentVolume = speakerGainNode.gain.value;
                //}
            //}
        //}
         
        //// event functions
        //// accept callback for trigger on lifecycle events
        //function bind(key,callback) {
            //onCallbacks[key] = callback;
        //} 
         
        //function unbind(key) {
            //delete onCallbacks[key]
        //} 
         
        //function startHotword() {
            //if (onCallbacks.hasOwnProperty('hotwordStart')) {
                //onCallbacks['hotwordStart']()
            //}
            //hotwordStarted = true;
            //if (!hotwordInitialised) {
                //let processCallback = function (keyword) {
                    //if (keyword && hotwordStarted) {
                        //startMicrophone()
                        //sendMessage('hermod/'+config.site+'/hotword/detected',{})
                        //if (onCallbacks.hasOwnProperty('hotwordDetected')) {
                            //onCallbacks['hotwordDetected'](keyword)
                        //}
                    //}
                //};
                //let readyCallback = function() {
                    ////console.log('hotword ready')
                    //hotwordReady = true;
                    //if (onCallbacks.hasOwnProperty('hotwordReady')) {
                        //onCallbacks['hotwordReady']()
                    //}
                //}

                
                //let audioManagerErrorCallback = function (ex) {
                    //console.log(ex);
                //};

                ////if (!porcupineManager) {
                    ////console.log('CREATE NEW porc WORKER')
                    //var webpack = false ;
                    ////console.log(config.javascript_environment)
                    ////console.log(config)
                    //if (config.javascript_environment === 'react') {
                        //webpack = true
                    //} 
                    //porcupineManager = PorcupineManager("./porcupine/porcupine_worker.js",webpack  );
                ////}
                //porcupineManager.start(KeywordData, SENSITIVITIES, processCallback, audioManagerErrorCallback, readyCallback);
                ////console.log(    'HOW STARYTED')
                //hotwordInitialised = true;
            //}
        //};

        //function stopHotword() {
            //if (onCallbacks.hasOwnProperty('hotwordStop')) {
                //onCallbacks['hotwordStop']()
            //}
            //hotwordStarted = false;
        //};
        

        ///**
         //* HELPER FUNCTIONS
         //*/
           
        ///**
         //* Bind silence recognition events to set speaking state
         //*/ 
        //function bindSpeakingEvents() {
             //if (!navigator.getUserMedia) {
                //navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
             //}
             //try {
                //if (navigator.getUserMedia) {
                  //navigator.getUserMedia({audio:true}, function(stream) {
                    //var options = {};
                    //var speechEvents = hark(stream, options);
                    //speechEvents.on('speaking', function() {
                      //clearTimeout(speakingTimeout)
                      //sendAudioBuffer(config.site) 
                      //speaking = true
                      //if (onCallbacks.hasOwnProperty('speaking')) {
                        //onCallbacks['speaking']()
                      //}
                    //});

                    //speechEvents.on('stopped_speaking', function() {
                      //// send an extra second of silence for ASR
                      //speakingTimeout = setTimeout(function() {
                             //clearTimeout(speakingTimeout)
                             //speaking = false
                             //if (onCallbacks.hasOwnProperty('stopspeaking')) {
                                //onCallbacks['stopspeaking']()
                             //}
                      //},3000);
                    //});    
                      
                  //}, function(e) {
                    //console.log(['MIC Error capturing audio.',e]);
                  //});
                //} else {
                    //console.log('MIC getUserMedia not supported in this browser.');
                //}
             //}   catch (e) {
                 //console.log(e);
             //}
        //};
        
        //function bufferAudio(audio) {
            //microphoneAudioBuffer.push(audio);
            //if (microphoneAudioBuffer.length > 30) {
                //microphoneAudioBuffer.shift();
            //}
        //}
        
        //function sendAudioBuffer(site) {
            //for (var a in microphoneAudioBuffer) {
                //sendAudioMessage('hermod/'+site+'/microphone/audio',microphoneAudioBuffer[a]);
            //}
            //microphoneAudioBuffer = [];
        //}
        
        
        //function startMicrophone() {
            //isSending = true;
            //muteVolume()
            //if (onCallbacks.hasOwnProperty('microphoneStart')) {
                //onCallbacks['microphoneStart']()
            //}
        //}
        
            
        //function gotDevices(deviceInfos,site) {
          //// TODO https://github.com/webrtc/samples/blob/gh-pages/src/content/devices/input-output/js/main.js
          //// Handles being called several times to update labels. Preserve values.
          //var device = 'default'
          //var devices={}
          //for (let i = 0; i !== deviceInfos.length; ++i) {
            //const deviceInfo = deviceInfos[i];
            //if (deviceInfo.kind === 'audioinput') {
                //devices[deviceInfo.label] = deviceInfo.deviceId
                //if (deviceInfo.label && deviceInfo.label.toLowerCase().indexOf('speakerphone') !== -1) {
                    //device = deviceInfo.deviceId
                //}
            //}
            //devices['FINAL'] = device
          //}
          //activateRecording(site,device)
        //}

        //function handleError(error) {
          //console.log('navigator.MediaDevices.getUserMedia error: ', error.message, error.name);
        //}
        
        
        //function activateRecording(site,deviceId) {
            //if (isRecording) return;
            //isRecording = true;
            
            //if (!navigator.getUserMedia) {
                //navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia ||
            //navigator.mozGetUserMedia || navigator.msGetUserMedia;
            //}
            
            //try {
                //if (navigator.getUserMedia) {
                  //navigator.getUserMedia({audio:true}, success, function(e) {
                    //console.log(['dMIC Error capturing audio.',e]);
                  //});
                //} else {
                    //console.log('MIC getUserMedia not supported in this browser.');
                //}
             //}   catch (e) {
                 //console.log(e);
             //}
            //function success(e) {
                  //microphoneContext = new audioContext();
                  //microphoneGainNode = microphoneContext.createGain();
                  //microphoneGainNode.gain.value = inputvolume;
                  
                  //var audioInput = microphoneContext.createMediaStreamSource(e);
                  
                  //var bufferSize = 4096;
                  
                    //function convertFloat32ToInt16(buffer) {
                      //if (buffer) {
                          //let l = buffer.length;
                          //let buf = new Int16Array(l);
                          //while (l--) {
                            //buf[l] = Math.min(1, buffer[l])*0x7FFF;
                          //}
                          //return buf.buffer;
                      //}
                    //}
                    
                    //function resample(sourceAudioBuffer,TARGET_SAMPLE_RATE,onComplete) {
                          //var offlineCtx = new OfflineAudioContext(sourceAudioBuffer.numberOfChannels, sourceAudioBuffer.duration * sourceAudioBuffer.numberOfChannels * TARGET_SAMPLE_RATE, TARGET_SAMPLE_RATE);
                          //var buffer = offlineCtx.createBuffer(sourceAudioBuffer.numberOfChannels, sourceAudioBuffer.length, sourceAudioBuffer.sampleRate);
                          //// Copy the source data into the offline AudioBuffer
                          //for (var channel = 0; channel < sourceAudioBuffer.numberOfChannels; channel++) {
                              //buffer.copyToChannel(sourceAudioBuffer.getChannelData(channel), channel);
                          //}
                          //// Play it from the beginning.
                          //var source = offlineCtx.createBufferSource();
                          //source.buffer = sourceAudioBuffer;
                          //source.connect(offlineCtx.destination); 
                          //source.start(0);
                          //offlineCtx.oncomplete = function(e) {
                            //// `resampled` contains an AudioBuffer resampled at 16000Hz.
                            //// use resampled.getChannelData(x) to get an Float32Array for channel x.
                            //var resampled = e.renderedBuffer;
                            //var leftFloat32Array = resampled.getChannelData(0);
                            //// use this float32array to send the samples to the server or whatever
                            //onComplete(leftFloat32Array);
                          //}
                          //offlineCtx.startRendering();
                    //}
         
                  //let recorderTimeout = null;  
                  //let recorder = microphoneContext.createScriptProcessor(bufferSize, 1, 1);
                  //recorder.onaudioprocess = function(e){
                      //if (isRecording  && isSending) { // && speaking) {
                          //resample(e.inputBuffer,16000,function(res) {
                            //if (! isPlaying) { 
                                //if (speaking && isRecording  && isSending) {
                                    //if (recorderTimeout) clearTimeout(recorderTimeout)
                                    //sendAudioMessage('hermod/'+site+'/microphone/audio',Buffer.from(convertFloat32ToInt16(res)))
                                //} else {
                                    //if (!recorderTimeout) setTimeout(function() {stopMicrophone(); startHotword()},5000)
                                    //bufferAudio(Buffer.from(convertFloat32ToInt16(res)));
                                //}
                            //} 
                          //});
                      //}
                  //}
                  
                //microphoneGainNode.connect(recorder);
                //audioInput.connect(microphoneGainNode);
                //recorder.connect(microphoneContext.destination);                         
            //}
        //}
        
     
        //function stopPlaying() {
            //console.log('STOP PLAY')
            //isPlaying = false
            //if (bufferSource) {
                 //console.log('STOP PLAY real')
                 //bufferSource.stop()
             //}
            //if (urlAudioPlayer) {
                //urlAudioPlayer.pause()
            //}
            //if (onCallbacks.hasOwnProperty('stopPlaying')) {
                //onCallbacks['stopPlaying']()
            //}
        //};
        
        //function playSound(bytes,playTime) {
            //if (!playTime) playTime = 0;
            //isPlaying = true
            //return new Promise(function(resolve,reject) {
                //try {
                    //if (bytes) {
                        //var buffer = new Uint8Array( bytes.length );
                        //buffer.set( new Uint8Array(bytes), 0 );
                        //speakerContext = new audioContext();
                        //speakerGainNode = speakerContext.createGain();
        
                        //speakerGainNode.gain.value =  outputvolume; //config.speakervolume/100 ? config.speakervolume/100 :
                        //speakerContext.decodeAudioData(buffer.buffer, function(audioBuffer) {
                            //// global bufferSource for share with stopPlaying
                            //bufferSource = speakerContext.createBufferSource();
                            //bufferSource.buffer = audioBuffer;
                            //bufferSource.connect(speakerGainNode);
                            //speakerGainNode.connect( speakerContext.destination );
                            
                            //try {
                                //bufferSource.start(0);
                            //} catch (e) {
                                //console.log('play sound error starting')
                                //console.log(e)
                                //isPlaying = false
                                //resolve()
                            //}
                            //bufferSource.onended = function() {
                                //console.log('PLAY SOUND BYTES source ended')
                                ////setTimeout(stopPlaying,100)
                                //isPlaying = false
                                //resolve();
                            //};
                            //bufferSource.onerror = function() {
                                //console.log('PLAY SOUND BYTES source error')
                                //isPlaying = false
                                //resolve();
                            //};
                        //},function(e) {
                             //console.log('PLAY SOUND BYTES decode FAIL')
                             //console.log(e)
                             //isPlaying = false
                             //resolve()   
                        //});
                        ////resolve()
                    //} else {
                        //console.log('PLAY SOUND BYTES no bytes')
                        //isPlaying = false
                        //resolve();
                    //}
                //} catch (e) {
                    //console.log('PLAY SOUND BYTES err')
                    //isPlaying = false
                    //console.log(e)
                    //resolve()
                //}
            //});                        
        //}
        
        //function playUrl(url) {
            //isPlaying = true 
            //return new Promise(function(resolve,reject) {
                //urlAudioPlayer = new Audio(url);
                //urlAudioPlayer.addEventListener("canplaythrough", event => {
                  ///* the audio is now playable; play it if permissions allow */
                  //urlAudioPlayer.play();
                //});
                //urlAudioPlayer.addEventListener("ended", event => {
                    //isPlaying = false 
                    //resolve()
                //})
                //urlAudioPlayer.addEventListener("error", event => {
                    //isPlaying = false
                    //resolve()
                //})
            //})
        //}    
        
        //function stopMicrophone() {
            //isSending = false;
            
            //if (onCallbacks.hasOwnProperty('microphoneStop')) {
                //onCallbacks['microphoneStop']()
            //}
            //unmuteVolume()
        //}
        //function stopAll() {
            //stopHotword()
            //stopMicrophone()
        //}   
        
        //function init() {
            //if (navigator && navigator.mediaDevices) {
                //navigator.mediaDevices.enumerateDevices().then(function(info){ gotDevices(info,config.site)} ).catch(handleError);
                //bindSpeakingEvents()
            //}
        //}
        
        //init()
             
        //return {setVolume: setVolume, muteVolume: muteVolume, unmuteVolume: unmuteVolume, playSound: playSound, stopPlaying: stopPlaying, say:say, stopAll:stopAll, bind:bind,unbind:unbind,startMicrophone: startMicrophone, stopMicrophone: stopMicrophone, sendAndWaitFor:sendAndWaitFor,sendAudioAndWaitFor:sendAudioAndWaitFor,sendMessage:sendMessage,sendNLUMessage:sendNLUMessage,sendASRTextMessage:sendASRTextMessage,authenticate:authenticate,connect:connect,disconnect:disconnect,startHotword:startHotword,stopHotword:stopHotword}
//}


//module.exports=VoiceAudioManager 
//try {
    //if (window) {
        //window.VoiceAudioManager = VoiceAudioManager
    //}
//} catch (e) {}
