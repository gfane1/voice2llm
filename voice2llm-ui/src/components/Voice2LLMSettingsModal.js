import {React, useState} from 'react'
import {Button, Modal} from 'react-bootstrap'

import useIcons from '../useIcons'

import TTSConfigForm from './TTSConfigForm'
import STTConfigForm from './STTConfigForm'
import LLMConfigForm from './LLMConfigForm'
import SystemMessageForm from './SystemMessageForm'


export default function Voice2LLMSettingsModal({aiUsage, config, setConfig, chatHistory, setChatHistory, forceRefresh}) {
	const [show, setShow] = useState(false);
	const icons = useIcons()
	const handleClose = () => {
		setShow(false);
		localStorage.setItem("voice2ui_config",JSON.stringify(config))
		//console.log("saved config",JSON.stringify(config))
		forceRefresh()
	}
	const handleShow = () => setShow(true);
	
	function clearConfig() {
		setConfig({llm:{},stt:{},tts:{}})
		forceRefresh()
		handleClose()
	}
	
	return (
		<>
		  <Button variant="primary" onClick={handleShow}>
			{icons.menu}
		  </Button>

		  <Modal
			show={show}
			onHide={handleClose}
		  >
			<Modal.Header closeButton>
			  <Modal.Title style={{marginRight:'2em'}}>Settings</Modal.Title>
			  
			</Modal.Header>
			<Modal.Body>
			  <div style={{float:'left', color:'red', fontWeight:'bold', fontSize:'0.7em', marginBottom:'0.5em'}}  >Warning! API Keys are stored in browser local storage on this computer.</div>
			  <Button style={{float:'right', fontSize:'0.7em'}} variant="danger" onClick={clearConfig} >Clear Config</Button>
			  <hr style={{width:'100%',clear:'both'}} />
			  <LLMConfigForm aiUsage={aiUsage} config={config} setConfig={setConfig}  />
			  <STTConfigForm  config={config} setConfig={setConfig}  />
			  <TTSConfigForm  config={config} setConfig={setConfig}  />

			</Modal.Body>
			
		  </Modal>
		</>
	)
}
