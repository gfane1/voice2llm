import logo from './logo.svg';
import './App.css';
import LoadRoleModal from './components/LoadRoleModal'
import {React, useState, useEffect, useRef} from 'react'
import 'bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import {Button, ListGroup, ButtonGroup} from 'react-bootstrap'

import useUtils from './useUtils'
import useAppState from './useAppState'
import TextareaAutosize from 'react-textarea-autosize';
import SpeechButton from './SpeechButton'
import Voice2LLMSettingsModal from './components/Voice2LLMSettingsModal'
import OpenAiWizard from './components/OpenAiWizard'
import SystemMessageEditorModal from './components/SystemMessageEditorModal'

import useOpenAiLlm from './useOpenAiLlm'
//import useGoogleGeminiLlm from './useGoogleGeminiLlm'
import useSelfHostedLlm from './useSelfHostedLlm'
import useGoogleLogin from './useGoogleLogin'
import useAudioPlayQueue from './useAudioPlayQueue'
import useOpenAiTts from './useOpenAiTts'
import useMeSpeakTts from './useMeSpeakTts'
import useWebSpeechTts from './useWebSpeechTts'
import useOpenAiUsageLogger from './useOpenAiUsageLogger'
import useSystemMessageManager from './useSystemMessageManager'
function App() {
	
	var {user, token, login, logout, refresh,loadCurrentUser, loadUserImage, breakLoginToken} = useGoogleLogin({clientId:process.env.REACT_APP_GOOGLE_OAUTH_CLIENT_ID, usePrompt: false, loginButtonId: 'google_login_button'})
  
	const {scrollTo, generateRandomId} = useUtils()
	const { refreshHash, setRefreshHash, forceRefresh, hasRequiredConfig, isSpeaking, setIsSpeaking, chatHistory, setChatHistory, isWaiting, startWaiting, stopWaiting, userMessage, setUserMessage, isReady, setIsReady, config, setConfig, llmEnabled, setLlmEnabled, icons, configRef} = useAppState()
	const {category, setCategory,exportRoles,importRoles,setSystemMessage,systemMessage,setSystemConfig, systemConfig, init, saveRole, loadRole, roles, setRoles, currentRole, setCurrentRole} = useSystemMessageManager({forceRefresh})
	const aiUsage = useOpenAiUsageLogger()
	
	const {playUrl, stopPlaying,isPlaying,setIsPlaying, isMuted, mute, unmute} = useAudioPlayQueue({
		onStopPlaying: function() {setIsPlaying(false); forceRefresh()},
		onStartPlaying: function() {setIsPlaying(true); forceRefresh()},
		onFinishedPlaying: function() {setIsPlaying(false); forceRefresh()}, 
		onError: function() {setIsPlaying(false); forceRefresh()}
	})
	const aiTts = useOpenAiTts({aiUsage})
	const webSpeechTts = useWebSpeechTts({forceRefresh})
	const meSpeakTts = useMeSpeakTts({})
	
	let usingOpenAiTts = (config && config.tts && config.tts.use === "openai" && config.tts.openai_key)? true : false
	let usingSelfHostedTts = (config && config.tts && config.tts.use === "self_hosted" && config.tts.self_hosted_url)? true : false
	let usingWebSpeechTts = (config && config.tts && config.tts.use === "web_speech")? true : false
	let usingMeSpeakTts = (config && config.tts && config.tts.use === "me_speak")? true : false
	let usingTts = (usingOpenAiTts || usingSelfHostedTts || usingWebSpeechTts || usingMeSpeakTts)
	
	let usingOpenAiStt = (config && config.tts && config.tts.use === "openai" && config.tts.openai_key)? true : false
	let usingSelfHostedStt = (config && config.tts && config.tts.use === "self_hosted" && config.tts.self_hosted_url)? true : false
	let usingLocalStt = (config && config.tts && config.tts.use === "local" && config.tts.local_whisper_model)? true : false
	let usingStt = (usingOpenAiStt || usingSelfHostedStt || usingLocalStt )
	
	
	async function playSpeech(text) {
		console.log("PS",text,config)
		if (text && config && config.tts && config.tts.use === "self_hosted" && config.tts.self_hosted_url) { 
			setIsPlaying(true)
			let q = config.tts.self_hosted_url +  "/api/tts?text="+text + "&speaker_id="+(config.tts && config.tts.speaker_id ? config.tts.speaker_id : 'p299')+"&style_wav=&language_id="
			await playUrl(q)
		} else if (text && config && config.tts && config.tts.use === "openai" && config.tts.openai_key) { 
			setIsPlaying(true)
			aiTts.speak(config.tts.openai_key, text, config.tts && config.tts.openai_voice ? config.tts.openai_voice : 'alloy').then(function(b64) {
				playUrl(b64)
			})
		} else if (text && config && config.tts && config.tts.use === "web_speech") { 
			setIsPlaying(true)
			webSpeechTts.speak(text).then(function() {
				setIsPlaying(false)
			})
		} else if (text && config && config.tts && config.tts.use === "me_speak") { 
			setIsPlaying(true)
			meSpeakTts.speak(text).then(function() {
				//console.log("spoken")
				setIsPlaying(false)
			})
		} else {
			// TODO handle microphone restart
		}
	}
	
	const aiLlm = useOpenAiLlm({
		onReady: function() {
			console.log('aillm rfffready',config)
			setLlmEnabled(true)
			forceRefresh()
		},
		onComplete: function(d, usage) {
			aiUsage.log(usage)
			//console.log('aillm complete',d,'ddd')
			chatHistory.current.push({role:'assistant',content:d})
			setChatHistory(chatHistory.current)
			//console.log('aillm complete schist',JSON.stringify(chatHistory),'ddd')
			forceRefresh()
			playSpeech(d)
		},
	})
	
	//const geminiLlm = useGoogleGeminiLlm({
		//onReady: function() {
			//console.log('gmllm rfffready',config)
			//setLlmEnabled(true)
			//forceRefresh()
		//},
		//onComplete: function(d) {
			//console.log('gmllm complete',d,'ddd')
			//chatHistory.push({role:'assistant',content:d})
			//setChatHistory(chatHistory)
			//console.log('gmllm complete schist',JSON.stringify(chatHistory),'ddd')
			//forceRefresh()
		//},
	//})
	
	function getLastAssistantChatIndex(chatHistory) {
		let r = JSON.parse(JSON.stringify(chatHistory)).reverse()
		for (let entry in r) {
			//console.log(entry,r[entry])
			if (entry && r[entry] && r[entry].role === 'assistant') {
				return r.length - entry - 1
			}
		}
	}
	
	function stopAllPlaying() {
		stopPlaying()
		meSpeakTts.stop()
		webSpeechTts.stop()
	}
	
	function stopLanguageModels() {
		localLlm.stop()
		aiLlm.stop()
		stopAllPlaying()
	}
	
	const localLlm = useSelfHostedLlm({
		onReady: function() {
			console.log('sh llm rready',config)
			setLlmEnabled(true)
			forceRefresh()
		},
		onStart: function() {
			//console.log('LOCAL LLM START')
			chatHistory.current.push({role:"assistant", content:''})
			setChatHistory(chatHistory.current)
			forceRefresh()
		},
		onUpdate: function(partial,d,count) {
			//console.log('LOCAL LLM UPDATE',count,d,chatHistory)
			//console.log('sh last index',getLastAssistantChatIndex(chatHistory))
			let lastIndex = getLastAssistantChatIndex(chatHistory.current)
			if (lastIndex) {
				//console.log('sh set alst index',lastIndex)
				chatHistory.current[lastIndex] = {role:"assistant", content:d}
			}
			playSpeech(partial)
			setChatHistory(chatHistory.current)
			forceRefresh()
		},
		onComplete: function(d, count) {
			//console.log('LOCAL LLM complete',count,d)
			let lastIndex = getLastAssistantChatIndex(chatHistory.current)
			if (lastIndex) {
				//console.log('sh set alst index',lastIndex)
				chatHistory.current[lastIndex] = {role:"assistant", content:d}
			}
			setChatHistory(chatHistory.current)
			forceRefresh()
			//playSpeech(d)
		},
	})
	
	// initialise relevant language model when config changes
	useEffect(function() {
		//console.log("INIT",config)
		//setLlmEnabled(false)
			
		if (config && config.llm && config.llm.openai_key && config.llm.use === 'openai') aiLlm.init(config.llm.openai_key)
		//if (config && config.llm && config.llm.google_gemini_key && config.llm.use === 'gemini') geminiLlm.init(config.llm.google_gemini_key)
		if (config && config.llm && config.llm.self_hosted_url && config.llm.self_hosted_model_type && config.llm.use === 'self_hosted') localLlm.init(config.llm.self_hosted_url+"/local/myclient/ws?token=sdfsdf", config.llm.self_hosted_model_type)
		configRef.current = config
	},[JSON.stringify(config)])
	
	
	function submitForm(userMessage,config) {
		try {
			console.log("SUBMIT", userMessage, config, chatHistory)
			if (userMessage) {
				stopLanguageModels()
				chatHistory.current.push({role:'user',content:userMessage})
				setChatHistory(chatHistory.current)
				setUserMessage('')
				forceRefresh()
				//console.log("SUBMIT hist", chatHistory,config)
				if (config && config.llm && config.llm.openai_key && config.llm.use === 'openai')  aiLlm.start(systemMessage, chatHistory.current)
				//if (config && config.llm && config.llm.google_gemini_key && config.llm.use === 'gemini')  geminiLlm.start(chatHistory)
				if (config && config.llm && config.llm.self_hosted_url && config.llm.use === 'self_hosted')  localLlm.start(systemMessage, chatHistory.current)
			}
		} catch (e) {
			console.log(e)
		}
		return false
	}
	
	let acceptingNewChats = !(aiLlm.isBusy || localLlm.isBusy || isPlaying || isWaiting)
	let utterancesTimeout = useRef()
	return (
		<div className="App" id={refreshHash} >
			{!hasRequiredConfig(configRef.current) && <OpenAiWizard config={config} setConfig={setConfig} forceRefresh={forceRefresh} />}
			{hasRequiredConfig(configRef.current) && <>
				<div id="menu" style={{zIndex:'9', backgroundColor:'lightgrey', border:'1px solid grey', position: 'fixed', top: 0, left: 0, width: '100%', height:'3em'}}  >
					
					<span style={{float:'left',marginTop:'0.2em',marginLeft:'0.2em'}} ><Voice2LLMSettingsModal aiUsage={aiUsage} config={config} setConfig={setConfig} chatHistory={chatHistory.current} setChatHistory={setChatHistory} forceRefresh={forceRefresh} /></span>
					
					<span style={{float:'left',marginTop:'0.2em',marginLeft:'0.2em'}} >	
					{(token && token.access_token) && <Button onClick={function() { logout()}} variant="danger" >{!(user && user.picture) && icons["user_logout"]} {(user && user.picture) && <img height="28" width="28" src={user.picture + '?access_token='+token.access_token + '&not-from-cache-please'} />}</Button>}
					
					{!(token && token.access_token) && <Button onClick={function() { login()}} variant="success" >{icons["user"]}</Button>}
					</span>
					
					<Button style={{float:'left',marginTop:'0.2em',marginLeft:'0.2em'}}  variant="success" onClick={function() {if (window.confirm('Reset conversation ?')) {setChatHistory([]); forceRefresh()}}} >{icons["plus"]}</Button>
					
					
					<span style={{float:'right',marginTop:'0.2em',marginRight:'0.2em'}} >
						{usingTts && <>
						{(!isSpeaking && !isMuted) && <button  style={{marginRight: '0.2em', color:'black'}} className="btn  btn-success"  id="muteButton" onClick={function() {mute(); stopAllPlaying()}} title="Mute"  >{icons["volume-vibrate-fill"]}</button>}
						{(!isSpeaking && isMuted) && <button  style={{marginRight: "0.2em", color:'black'}} className="btn btn-secondary"  id="unmuteButton" onClick={unmute}  title="UnMute" >{icons["volume-off-vibrate-fill"]}</button>}
						{(isSpeaking) && <button  style={{marginRight: "0.2em", color:'black'}} className="btn btn-success"  id="playingButton" onClick={stopPlaying}  title="Stop Playing" >{icons["speak"]}</button>}
						</>}
						{usingStt && <SpeechButton 
							config={config}
							aiUsage={aiUsage}
							forceRefresh={forceRefresh}
							stopLanguageModels={stopLanguageModels}
							isMuted={isMuted}
							isPlaying={isPlaying}
							allowRestart={true}
							isWaiting={isWaiting}
							startWaiting={startWaiting}
							stopWaiting={stopWaiting}
							isReady={isReady} setIsReady={setIsReady}
							onTranscript = {function(v) {
								//console.log('F:',v)
								if (v) {
									setUserMessage(userMessage + "\n" + v)
									clearTimeout(utterancesTimeout.current)
									utterancesTimeout.current = setTimeout(function() {
										submitForm(v,config)
									},3000)
								}
							}}
							onPartialTranscript = {function(v) {
								//console.log('P:',v)
								setUserMessage(v)
							}}
							
						/>}
					</span>
					{(config && (config.stt && config.stt.use === "openai" && config.stt.openai_key) || (config.tts && config.tts.use === "openai" && config.tts.openai_key) || (config.llm && config.llm.use === "openai" && config.llm.openai_key))  && <span style={{float:'right', marginTop:'0.7em',marginRight:'1em'}}>{icons.openai} <b>{aiUsage.getTotal()}</b>
						</span>}
					
				</div>
				<div id="body" style={{zIndex:'3',position: 'fixed', top: '3em', left: 0, width: '100%',  paddingTop:'0.2em'}}  >
					<form  onSubmit={function(e) {submitForm(userMessage,config); e.preventDefault(); return false}} >
						
						<TextareaAutosize disabled={!acceptingNewChats || !llmEnabled} style={{width: "86%", fontSize: '1em', float: "left"}} type='text' id="usermessage"  placeholder="Message" onChange={function(e) {setUserMessage(e.target.value)}} value={userMessage}  />
						
						<span style={{width:'14%', paddingRight:'1em'}}>
							{acceptingNewChats && <button id="sendbutton" disabled={!llmEnabled}  style={{float: 'right', marginRight: '0.2em', color:'black'}} className="btn btn-primary"  onClick={function() {return false}} type="submit" title="Send" >{icons["send-plane-line"]}</button>}
							
							{!acceptingNewChats && <button  disabled={!llmEnabled}  style={{float: 'right',marginRight: "0.2em", color:'black'}} className="btn  btn-danger"  id="stopLMMButton" onClick={stopLanguageModels}  title="Stop" >{icons["hexagon-fill"]}</button>}
						</span>
						
					</form>
					<div style={{textAlign:'left', marginTop:'1em', paddingBottom:'1em'}} >
					
					<ButtonGroup style={{}} >
						<LoadRoleModal importRoles={importRoles} exportRoles={exportRoles} loadRole={loadRole} roles={roles}  setRoles={setRoles} />
						<SystemMessageEditorModal importRoles={importRoles} exportRoles={exportRoles} roles={roles} setRoles={setRoles} category={category} setCategory={setCategory} setSystemMessage={setSystemMessage}  systemMessage={systemMessage} chatHistory={chatHistory.current} setChatHistory={setChatHistory} systemConfig={systemConfig} setSystemConfig={setSystemConfig} saveRole={saveRole} loadRole={loadRole} currentRole={currentRole} setCurrentRole={setCurrentRole} exportRoles={exportRoles} importRoles={importRoles} />
					</ButtonGroup>
					</div>
				</div>
				
				<div id="responseContainer" style={{marginTop:'8.6em',clear:'both', width:'98%', fontSize: '1em', marginLeft:'0.1em', marginRight:'0.1em'}} >
					<div style={{fontWeight:'bold',textAlign:'left', width:'100%'}} >{chatHistory.current && chatHistory.current.filter(function(v) {return (v.role === 'system')}).map(function(v) {return v.content}).join("/n")}</div>
					<ListGroup>
					{chatHistory.current && chatHistory.current.filter(function(message) {
						return message && (message.role === "user" || message.role === "assistant")
					}).map(function(message,mkey) {
						return <ListGroup.Item style={{backgroundColor: ((mkey%2 === 0) ? "green" : "blue")}} style={{textAlign:'left'}} >
							<b>{message.role === "user" ? 'USER:' : 'ASSISTANT:'}</b> <span>{message.content}</span>  
						</ListGroup.Item>
					})}
					</ListGroup>
					<hr/>
				</div>
				<div style={{position: 'fixed', bottom: 0, right:0, backgroundColor: 'white', height: '3em', width:'3em'}} >
					<a target='new' href="https://github.com/syntithenai/voice2llm" style={{color:'black'}}  >{icons["github"]}</a>
				</div>  
			</>}
		</div>
	);
}

export default App;
//<div style={{clear:'both', position: 'fixed',top:'5em',left:0}}>asdfasdf</div>
			//<div id="menu" style={{position: 'fixed', bottom: 1, left: 1, width: '100%'}}  >
				//<div id="buttons"  style={{backgroundColor:'lightgrey', width: '100%'}} >
					//<div className="row"  style={{width: '100%'}}>
						//<div className="col-12 col-sm-6" style={{paddingBottom: "0.5em"}} >
							
							
						//</div>
						//<div className="col-12 col-sm-6">
							
							//<div id="buttonsright"  style={{float: "right"}} >
								
								//<button  style={{float: "right", color:'black'}} className="btn btn-danger" id="startButton" onClick={startMicrophone}   >{icons["mic-off-fill"]}</button>
								//<button  style={{float: "right",display: "none", color:'black'}} className="btn btn-success"  id="stopButton" onClick={stopMicrophone} >{icons["mic-fill"]}</button>
								
							//</div>
						//</div>
					//</div>
					
				//</div>
				
			//</div>
			//<div id="responseContainer" style={{marginTop: '9em', fontSize: '1.4em', marginLeft:'0.3em', marginRight:'0.3em'}} >
				//{JSON.stringify(chatHistory)}
			//</div>
			
//{JSON.stringify(config)}
				//{JSON.stringify(chatHistory)}
				
