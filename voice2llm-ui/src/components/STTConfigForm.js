import React, { useState } from 'react';
import { Form, Row, Col, Button, FormCheck } from 'react-bootstrap';

const STTConfigForm = ({config, setConfig}) => {
  // State variables to manage the input values
  const [openaiKey, setOpenaiKey] = useState(config && config.stt && config.stt.openai_key ? config.stt.openai_key : '');
  const [sttUrl, setSttUrl] = useState(config && config.stt && config.stt.self_hosted_url ? config.stt.self_hosted_url : '');
  const [localWhisperModel, setLocalWhisperModel] = useState(config && config.stt && config.stt.local_whisper_model ? config.stt.local_whisper_model : '')
  const [useStt, setUseSttInner] = useState(config && config.stt && config.stt.use ? config.stt.use : '')  // local, openai, self_hosted
  const [useHotword, setUseHotword] = useState(config && config.stt && config.stt.use_hotword ? config.stt.use_hotword : '')  // local, openai, self_hosted
	
  function setUseStt(v) {
		setUseSttInner(v)
		setConfigValue('use',v)
	}
  // Function to handle form submission
  const handleSubmit = (event) => {
    event.preventDefault();
    return false
  };

	function setConfigValue(key,value) {
		let c = config ? config : {}
		if (!c) c = {}
		if (!c.stt) c.stt = {}
		c.stt[key] = value
		setConfig(c)
   }

  return (
    <Form onSubmit={handleSubmit}>
		<div className="border p-3 mb-3">
			<h5>Speech To Text</h5>
		  <Row className="mb-3">
			<Form.Group as={Col} controlId="useHotwordKey">
			  <Form.Label>Use Hotword (<i>Hey Edison</i>)?</Form.Label>
			 <FormCheck
			    style={{display:'inline', marginLeft:'1em'}} 
				type="checkbox"
				checked={useHotword}
				onChange={(e) => {setUseHotword(e.target.checked);}}
				onBlur={(e) => setConfigValue('use_hotword',e.target.checked)}
			  />
			</Form.Group>  
		</Row>
		
		<Row className="mb-3">
			<Form.Group as={Col} controlId="openaiKey">
			  <FormCheck
			    style={{display:'inline', marginRight:'0.2em'}} 
				type="checkbox"
				checked={useStt === 'openai'}
				onChange={(e) => {setUseStt(e.target.checked ? 'openai' : '')}}
			  />
			  <Form.Label>OpenAI API Key</Form.Label>
			  <Form.Control
				type="text"
				value={openaiKey}
				onChange={(e) => {setOpenaiKey(e.target.value); setUseStt('openai')}}
				onBlur={(e) => setConfigValue('openai_key',e.target.value)}
			  />
			</Form.Group>
			<Form.Group controlId="sttUrl" style={{marginTop:'0.2em'}} >
            <FormCheck
			    style={{display:'inline', marginRight:'0.2em'}} 
				type="checkbox"
				checked={useStt === 'self_hosted'}
				onChange={(e) => {setUseStt(e.target.checked ? 'self_hosted' : '')}}
			  />
		  <Form.Label>Self Hosted URL</Form.Label>
          <Form.Control
            type="text"
            value={sttUrl}
            onChange={(e) => {setSttUrl(e.target.value); setUseStt('self_hosted')}}
            onBlur={(e) => setConfigValue('self_hosted_url',e.target.value)}
          />
        </Form.Group>
        <div style={{border:'1px solid grey', padding:'0.5em', marginTop:'1em' }} >
			<h6>Offline</h6>
        <Form.Group as={Col} controlId="openaiKey">
			  <FormCheck
			    style={{display:'inline', marginRight:'0.2em'}} 
				type="checkbox"
				checked={useStt === 'local'}
				onChange={(e) => {setUseStt(e.target.checked ? 'local' : '')}}
			  />
			  <Form.Label>Local Whisper Model</Form.Label>
			   <Form.Select aria-label="Whisper Model"
				value={localWhisperModel}
				onChange={(e) => {setLocalWhisperModel(e.target.value); setUseStt('local')}}
				onBlur={(e) => setConfigValue('local_whisper_model',e.target.value)}
			   >
				  <option value=""></option>
				  <option value="tiny">Tiny</option>
				  <option value="small">Small</option>
				  <option value="medium">Medium</option>
				</Form.Select>
			  
			</Form.Group>
        
        </div>
		  </Row>
		 </div>
      

      
    </Form>
  );
};

export default STTConfigForm;
