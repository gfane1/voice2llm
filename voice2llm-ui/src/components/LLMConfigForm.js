import React, { useState } from 'react';
import { Form, Row, Col, Button, FormCheck } from 'react-bootstrap';


const LLMConfigForm = ({aiUsage, config, setConfig}) => {
 
	const [openAiKey, setOpenAiKey] = useState(config && config.llm && config.llm.openai_key? config.llm.openai_key : '')
	const [openAiModel, setOpenAiModel] = useState(config && config.llm && config.llm.openai_model? config.llm.openai_model : 'gpt-3.5-turbo-0125')
	const [geminiKey, setGeminiKey] = useState(config && config.llm && config.llm.google_gemini_key ? config.llm.google_gemini_key : '')
	const [selfHostedUrl, setSelfHostedUrl] = useState(config && config.llm && config.llm.self_hosted_url ? config.llm.self_hosted_url : '')
	const [modelType, setModelType] = useState(config && config.llm && config.llm.self_hosted_model_type ? config.llm.self_hosted_model_type : 'orca-mini-3')
	
	
	// openai,gemini,self_hosted
	const [useLlm, setUseLlmInner] = useState(config && config.llm && config.llm.use ? config.llm.use : '')
	function setUseLlm(v) {
		setUseLlmInner(v)
		setConfigValue('use',v)
	}
 
   function setConfigValue(key,value) {
		let c = config ? config : {}
		if (!c.llm) c.llm = {}
		c.llm[key] = value
		setConfig(c)
   }

  return (
    <Form onSubmit={function(e) {e.preventDefault(); return false}}>
    <h5>Language Model</h5>
    {!useLlm && <b style={{color:'red'}} >You need to choose a language model to chat with.</b>}
    	<div className="border p-3 mb-3">
		  <Row className="mb-3">
			<Form.Group as={Col} controlId="openaiKey">
			  <FormCheck
			    style={{display:'inline', marginRight:'0.2em'}} 
				type="checkbox"
				checked={useLlm === 'openai'}
				onChange={(e) => {setUseLlm(e.target.checked ? 'openai' : '')}}
			  />
			  <Form.Label>OpenAI API Key</Form.Label>
			  <Form.Text><span style={{display:'block',marginLeft:'3em', fontStyle:'italic', fontSize:'0.7em'}} >See <a target="_new" href="https://platform.openai.com/api-keys" >https://platform.openai.com/api-keys</a></span></Form.Text>
			  
			  <Form.Control
				type="text"
				value={openAiKey}
				onChange={(e) => {setOpenAiKey(e.target.value); setUseLlm('openai')}}
				onBlur={(e) => setConfigValue('openai_key',e.target.value)}
			  />
			  <Form.Label>OpenAI Model</Form.Label>
			  <Form.Text><span style={{display:'block',marginLeft:'3em', fontStyle:'italic', fontSize:'0.7em'}} >Prices per million tokens</span></Form.Text>
			  
			  <Form.Select value={openAiModel}
				onChange={(e) => {setOpenAiModel(e.target.value); setUseLlm('openai')}}
				onBlur={(e) => setConfigValue('openai_model',e.target.value)} aria-label="Select model">
					   {Object.keys(aiUsage.pricing).map(function(modelKey) {
						   return <option key={modelKey} value={modelKey}>{modelKey} (IN:${aiUsage.pricing[modelKey].price_in} OUT:${aiUsage.pricing[modelKey].price_out})</option>
					   })} 
					  
			  </Form.Select>
			</Form.Group>
			
		  </Row>
		 </div>
      
      <div className="border p-3 mb-3">
		<h5  ></h5>
		
        <Form.Group controlId="llmUrl">
          <FormCheck
			    style={{display:'inline', marginRight:'0.2em'}} 
				type="checkbox"
				checked={useLlm === 'self_hosted'}
				onChange={(e) => {setUseLlm(e.target.checked ? 'self_hosted' : '')}}
		  />
		  <Form.Label>Self Hosted URL</Form.Label>
          <Form.Text><span style={{display:'block',marginLeft:'3em', fontStyle:'italic', fontSize:'0.7em'}} >See <a href="https://github.com/syntithenai/voice2llm" target="-new" >https://github.com/syntithenai/voice2llm</a></span></Form.Text>
          <Form.Control
            type="text" 
            value={selfHostedUrl}
            onChange={(e) => {setSelfHostedUrl(e.target.value); setUseLlm('self_hosted')}}
            onBlur={(e) => setConfigValue('self_hosted_url',e.target.value)}
          />
          <Form.Label>Model Type</Form.Label>
          <Form.Select value={modelType}
				onChange={(e) => {setModelType(e.target.value); setUseLlm('self_hosted')}}
				onBlur={(e) => setConfigValue('self_hosted_model_type',e.target.value)} aria-label="Select model">
					  <option key={"1"} value="openai" >OpenAI</option>
					   <option key={"2"} value="orca-mini-3" >Orca Mini 3</option>
					   <option key={"3"} value="nous-hermes-2-mistral" >Nous Hermes 2 Mistral</option>
					  
			  </Form.Select>
        </Form.Group>
        
      </div>
      
    </Form>
  );
};

export default LLMConfigForm;
//<Form.Group as={Col} controlId="googleGeminiKey">
			  //<FormCheck
			    //style={{display:'inline', marginRight:'0.2em'}} 
				//type="checkbox"
				//checked={useLlm === 'gemini'}
				//onChange={(e) => {setUseLlm(e.target.checked ? 'gemini' : '')}}
			  ///>
			  //<Form.Label>Google Gemini API Key</Form.Label>
			  //<Form.Control
				//type="text"
				//value={geminiKey}
				//onBlur={(e) => setConfigValue('google_gemini_key',e.target.value)}
				//onChange={(e) => {setGeminiKey(e.target.value); setUseLlm('gemini')}}
			  ///>
			//</Form.Group>
