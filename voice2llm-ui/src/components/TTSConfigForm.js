import React, { useState } from 'react';
import { Form, Row, Col, Button, FormCheck } from 'react-bootstrap';
import useWebSpeechTts from '../useWebSpeechTts'
import useMeSpeakTts from '../useMeSpeakTts'

const TTSConfigForm = ({config, setConfig}) => {
  // State variables to manage the input values
  const [openaiKey, setOpenaiKey] = useState(config && config.tts && config.tts.openai_key ? config.tts.openai_key : '');
  const [ttsUrl, setTtsUrl] = useState(config && config.tts && config.tts.self_hosted_url ? config.tts.self_hosted_url : '')
  const webTts = useWebSpeechTts({})
  const meTts = useMeSpeakTts({})
//  "https://localhost:5002/api/tts?speaker_id=p299&style_wav=&language_id=&text=")
	const [useTts, setUseTtsInner] = useState(config && config.tts && config.tts.use ? config.tts.use : '')  // openai, self_hosted

	function setUseTts(v) {
		setUseTtsInner(v)
		setConfigValue('use',v)
	}
  // Function to handle form submission
  const handleSubmit = (event) => {
    event.preventDefault();
    return false
  };

	function setConfigValue(key,value) {
		let c = config ? config : {}
		if (!c.tts) c.tts = {}
		c.tts[key] = value
		setConfig(c)
   }

  return (
    <Form onSubmit={handleSubmit}>
		<div className="border p-3 mb-3">
			<h5>Text To Speech</h5>
		  <Row className="mb-3">
			<Form.Group as={Col} controlId="openaiKey">
			  <FormCheck
			    style={{display:'inline', marginRight:'0.2em'}} 
				type="checkbox"
				checked={useTts === 'openai'}
				onChange={(e) => {setUseTts('openai')}}
			  />
			  <Form.Label>OpenAI API Key</Form.Label>
			  
			  <Form.Control
				type="text"
				value={openaiKey}
				onChange={(e) => {setOpenaiKey(e.target.value); setUseTts('openai')}}
				onBlur={(e) => setConfigValue('openai_key',e.target.value)}
			  />
			</Form.Group>
			
			<Form.Group controlId="ttsUrl" style={{marginTop:'0.2em'}}>
			  <FormCheck
					style={{display:'inline', marginRight:'0.2em'}} 
					type="checkbox"
					checked={useTts === 'self_hosted'}
					onChange={(e) => {setUseTts(e.target.checked ? 'self_hosted' : '')}}
			  />
			  <Form.Label>Self Hosted URL</Form.Label>
			  <Form.Text><span style={{display:'block',marginLeft:'3em', fontStyle:'italic', fontSize:'0.7em'}} >eg https://192.168.1.56:5002</span></Form.Text>
			<Form.Control
				type="text"
				value={ttsUrl}
				onChange={(e) => {setTtsUrl(e.target.value); setUseTts('self_hosted')}}
				onBlur={(e) => setConfigValue('self_hosted_url',e.target.value)}
			  />
			</Form.Group>
			<div style={{border:'1px solid grey', padding:'0.5em', marginTop:'1em' }} >
				<h6>Offline</h6>
				<Form.Group controlId="ttsWebSpeech" style={{marginTop:'0.2em'}}>
					  <FormCheck
							style={{display:'inline', marginRight:'0.2em'}} 
							type="checkbox"
							checked={useTts === 'web_speech'}
							onChange={(e) => {setUseTts(e.target.checked ? 'web_speech' : '')}}
					  />
					  <Form.Label>Web Speech</Form.Label>
					   
					<Form.Select aria-label="Select voice">
					   <option></option>
					   {(webTts.availableVoices && webTts.availableVoices.length > 0) && webTts.availableVoices.map(function(voice,vk) {return <option value={vk} >{voice.name}</option>}) }
					</Form.Select>
				</Form.Group>
				<Form.Group controlId="ttsMeSpeech" style={{marginTop:'0.2em'}}>
					  <FormCheck
							style={{display:'inline', marginRight:'0.2em'}} 
							type="checkbox"
							checked={useTts === 'me_speak'}
							onChange={(e) => {setUseTts(e.target.checked ? 'me_speak' : '')}}
					  />
					  <Form.Label>MeSpeak</Form.Label>
					  
					
				</Form.Group>
			</div>
		  </Row>
		 </div>
     
    </Form>
  );
};

export default TTSConfigForm;
