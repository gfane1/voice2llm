import React, { useState , useEffect} from 'react';
import { Form, Row, Col, Button, FormCheck } from 'react-bootstrap';
import TextareaAutosize from 'react-textarea-autosize';
import DropdownText from './DropdownText'
import ModelOptionsForm from './ModelOptionsForm'

// gpt4all - max_tokens=200, temp=0.7, top_k=40, top_p=0.4, min_p=0.0, repeat_penalty=1.18, repeat_last_n=64, n_batch=8
// openai - max tokens, temp, stop seq, top_p, frequency_penalty (words), presence_penalty (topics)
// google - gemini 1 - temp, stop seq, top p, top k

//maxTokens(0-4096), temperature(0-1), topK(0-100), topP(0-1)
//+ gpt4all - min_p=0.0, repeat_penalty=1.18, repeat_last_n=64, n_batch=8
//+ openai - stop_seq, frequency_penalty (words), presence_penalty (topics)

const SystemMessageForm = ({currentRole, setCurrentRole, systemConfig, setSystemConfig, category, setCategory, roles, systemMessage, setSystemMessage,chatHistory,setChatHistory}) => {
  
  const categories = ['','general','legal','chain of thought','multi shot','code']
  return (
    <Form onSubmit={function(e) {e.preventDefault(); return false}}>
      <div className="border p-3 mb-3">
			<Row className="mb-3">
				<Form.Group as={Col} controlId="openaiKey">
					<Row className="mb-3">
					<Col>
				   <Form.Label>Name</Form.Label>
				  <Form.Control type="text" 
				   onChange={(e) => setCurrentRole(e.target.value)}
					value={currentRole}
				></Form.Control>
				  </Col>
				  <Col>
				   <Form.Label>Category</Form.Label>
				  <Form.Select 
					onChange={(e) => setCategory(e.target.value)}
					value={category}
				  >
				  {categories.map(function(c) {return <option>{c}</option>})}
				  </Form.Select>
				  </Col>
				  </Row>
				</Form.Group>
				<Form.Group  controlId="openaiKey">
				<Form.Label>Instructions</Form.Label>
				  <TextareaAutosize 
				   style={{width:'100%', height:'6em'}}
					onChange={(e) => setSystemMessage(e.target.value)}
					value={systemMessage}
				  ></TextareaAutosize>
				</Form.Group>
			</Row>
			<ModelOptionsForm onChange={setSystemConfig} value={systemConfig} />
			
		</div>
     
    </Form>
  );
};

export default SystemMessageForm;
