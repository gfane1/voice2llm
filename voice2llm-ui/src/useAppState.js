import {React, useState, useEffect, useRef} from 'react'

import useUtils from './useUtils'
import useIcons from './useIcons'

export default function useAppState(props) {

	const {scrollTo, generateRandomId} = useUtils()
	
	const chatHistory = useRef([])
	
	function setChatHistory(history) {
		chatHistory.current = history
		forceRefresh()
	}

	const [isWaiting, setIsWaiting] = useState(false)
	const [userMessage, setUserMessage] = useState('')
	const [isReady, setIsReady] = useState(false)
	const [isSpeaking, setIsSpeaking] = useState(false)
	const [config, setConfig] = useState()
	const [llmEnabled, setLlmEnabled] = useState(false)
	const configRef = useRef({})
	
	const icons = useIcons()
	
	// load config from localStorage
	useEffect(function() {
		if (!config) { 
			try {
				let c = JSON.parse(localStorage.getItem("voice2ui_config"))
				setConfig(c)
				forceRefresh()
			} catch (e) {
				setConfig({llm:{},tts:{},stt:{}})
				forceRefresh()
			}
		}
	},[])
	
	// trigger wizard if no llm is configured
	function hasRequiredConfig() {
		let useOpenAi = (config && config.llm && config.llm.use === "openai" && config.llm.openai_key)? true : false
		let useSelfHosted = (config && config.llm && config.llm.use === "self_hosted" )? true : false
		return useOpenAi || useSelfHosted
	}
	
	function startWaiting() {
		setIsWaiting(true)
	}
	
	function stopWaiting() {
		setIsWaiting(false)
	}
	const [refreshHash, setRefreshHash] = useState(new Date().getTime())
	function forceRefresh() {
		setRefreshHash(new Date().getTime())
	}

	return { llmEnabled, setLlmEnabled, icons, configRef, refreshHash, setRefreshHash, forceRefresh, hasRequiredConfig, isSpeaking, setIsSpeaking, chatHistory, setChatHistory, isWaiting, startWaiting, stopWaiting,  userMessage, setUserMessage, isReady, setIsReady, config, setConfig}
}
