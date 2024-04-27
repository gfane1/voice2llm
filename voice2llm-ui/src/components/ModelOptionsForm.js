import React, { useState , useEffect} from "react";
import { Form, Row, Col, Button } from "react-bootstrap";

export default function ModelOptionsForm ({value, onChange})  {
  const [maxTokens, setMaxTokens] = useState(value && value.maxTokens ? value.maxTokens : 200);
  const [temperature, setTemperature] = useState(value && value.temperature ? value.temperature : 0.7);
  const [topK, setTopK] = useState(value && value.topK ? value.topK : 40);
  const [topP, setTopP] = useState(value && value.topP ? value.topP : 0.4);
  const [outputType, setOutputType] = useState(value && value.outputType ? value.outputType : '');

	useEffect(function() {
		setMaxTokens(value && value.maxTokens ? value.maxTokens : 200)
		setTemperature(value && value.temperature ? value.temperature : 0.7);
		setTopK(value && value.topK ? value.topK : 40);
		setTopP(value && value.topP ? value.topP : 0.4);
		setOutputType(value && value.outputType ? value.outputType : '');
	},[JSON.stringify(value)])

  const handleMaxTokensChange = (e) => {
    setMaxTokens(e.target.value);
    onChange({outputType,maxTokens:e.target.value,temperature,topK,topP})
  };
  
  const handleOutputTypeChange = (e) => {
    setOutputType(e.target.value);
    onChange({outputType:e.target.value,maxTokens,temperature,topK,topP})
  };

  const handleTemperatureChange = (e) => {
    setTemperature(e.target.value);
    onChange({outputType,maxTokens,temperature:e.target.value,topK,topP})
  };

  const handleTopKChange = (e) => {
    setTopK(e.target.value);
    onChange({outputType,maxTokens,temperature,topK:e.target.value,topP})
  };

  const handleTopPChange = (e) => {
    setTopP(e.target.value);
    onChange({outputType,maxTokens,temperature,topK,topP: e.target.value})
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    return false
  };

  return (
    <Form onSubmit={handleSubmit}>
      <Row>
        <Col>
          <Form.Group controlId="modelType">
            <Form.Label>Output Format:</Form.Label>
            <Form.Select
              value={outputType}
              onChange={handleOutputTypeChange}
            >
            <option></option>
            <option>JSON</option>
            <option>Markdown</option>
            <option>YAML</option>
            <option>XML</option>
            </Form.Select>
          </Form.Group>
        </Col>
      </Row>
      <Row>
        <Col>
          <Form.Group controlId="maxTokens">
            <Form.Label>Max Tokens: <Form.Control
              type="text"
              value={maxTokens}
              onChange={handleMaxTokensChange}
            /></Form.Label>
            <Form.Control
              type="range"
              min={0}
              max={64536}
              value={maxTokens}
              onChange={handleMaxTokensChange}
            />
          </Form.Group>
        </Col>
      </Row>
      <Row>
        <Col>
          <Form.Group controlId="temperature">
            <Form.Label>Temperature: {temperature}</Form.Label>
            <Form.Control
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={temperature}
              onChange={handleTemperatureChange}
            />
          </Form.Group>
        </Col>
      </Row>
      <Row>
        <Col>
          <Form.Group controlId="topK">
            <Form.Label>Top K: {topK}</Form.Label>
            <Form.Control
              type="range"
              min={0}
              max={100}
              value={topK}
              onChange={handleTopKChange}
            />
          </Form.Group>
        </Col>
      </Row>
      <Row>
        <Col>
          <Form.Group controlId="topP">
            <Form.Label>Top P: {topP}</Form.Label>
            <Form.Control
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={topP}
              onChange={handleTopPChange}
            />
          </Form.Group>
        </Col>
      </Row>
      
    </Form>
  );
};

