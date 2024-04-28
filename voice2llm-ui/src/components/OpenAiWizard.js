import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import {useState, useEffect} from 'react'

export default function OpenAiWizard({config, setConfig, forceRefresh}) {
	
	const [key,setKey] = useState('')
	const [url,setUrl] = useState('')
	
	useEffect(function() {
		setKey(config && config.llm && config.llm.openai_key ? config.llm.openai_key : '')
	},[JSON.stringify(config)])
	
	function setApiKey() {
		if (key) {
			config = config ? config : {}
			config.llm = config.llm ? config.llm : {}
			config.stt = config.stt ? config.stt : {}
			config.tts = config.tts ? config.tts : {}
			config.llm.openai_key = key
			config.llm.use = "openai"
			config.stt.openai_key = key
			config.stt.use = "openai"
			config.tts.openai_key = key
			config.tts.use = "openai"
			setConfig(config)
			forceRefresh()
		}
	}
	
	function setUseLocal() {
		config = config ? config : {}
		config.llm = config.llm ? config.llm : {}
		config.llm.use = 'self_hosted'
		setConfig(config)
		forceRefresh()
	}
	
	function setSelfHosted() {
		if (key) {
			config = config ? config : {}
			config.llm = config.llm ? config.llm : {}
			config.stt = config.stt ? config.stt : {}
			config.tts = config.tts ? config.tts : {}
			config.llm.self_hosted_url = "wss://"+url+":444/llm"
			config.llm.use = "self_hosted"
			config.stt.self_hosted_url = "wss://"+url+"/stt"
			config.stt.use = "self_hosted"
			config.tts.self_hosted_url = "https://"+url+":5002"
			config.tts.use = "self_hosted"
			setConfig(config)
			forceRefresh()
		}
	}
	
	return <div>
	<h5>Quick Start</h5>
	<div style={{	 borderBottom: '2px solid black'}} >
	The fastest way to get going is to enter an API key for OpenAI.<br/>
	<span style={{display:'block',marginLeft:'3em', fontStyle:'italic'}} >See <a target="_new" href="https://platform.openai.com/api-keys" >https://platform.openai.com/api-keys</a></span>
	
	Technical folks can run your own language model and other services easily using Docker. <span style={{display:'block',marginLeft:'3em', fontStyle:'italic'}} >See <a href="https://github.com/syntithenai/voice2llm" target="-new" >https://github.com/syntithenai/voice2llm</a></span>
          
	
	</div>
	<Form>
      <Form.Group className="mb-3" controlId="formKey">
        <Form.Label>OpenAi Key</Form.Label>
        <Button style={{float:'right'}} disabled={!key} variant="primary" onClick={setApiKey} >
        Set
		</Button>
		<Form.Control type="text" placeholder="Enter key" value={key} onChange={function(e) {setKey(e.target.value)}} />
        <Form.Text className="text-muted">
          <div style={{ color:'red', fontWeight:'bold'}}  >Warning! API Keys are stored in browser local storage on this computer.</div>
          <div style={{ color:'red', fontWeight:'bold'}}  >API Keys are used strictly for relevant API requests and do not leave this computer for any other reason.</div>
        </Form.Text>
        
      </Form.Group>
	<Form.Group className="mb-3" controlId="formUrl">
        <Form.Label>Self Hosted Hostname</Form.Label>
        <div><Form.Text className="text-muted">
        eg 192.168.1.22 or localhost or mydomain.com 
        </Form.Text></div>
        <Button style={{float:'right'}}  disabled={!key} variant="primary" onClick={setSelfHosted} >
			Setup Self Hosted
		  </Button>
        <Form.Control type="text" placeholder="Enter hostname or IP address" value={url} onChange={function(e) {setUrl(e.target.value)}} />
        
      </Form.Group>
      &nbsp;&nbsp;
      
      <Button  variant="warning" onClick={setUseLocal} >
        Skip
      </Button>
    </Form></div>
}
