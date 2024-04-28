import {React, useState, useRef} from 'react'
import {Button, Modal, ListGroup, Form, Tabs} from 'react-bootstrap'

import useIcons from '../useIcons'

import TTSConfigForm from './TTSConfigForm'
import STTConfigForm from './STTConfigForm'
import LLMConfigForm from './LLMConfigForm'
import SystemMessageForm from './SystemMessageForm'


export default function LoadRoleModal({roles, setRoles, loadRole, importRoles, exportRoles}) {
	const [show, setShow] = useState(false);
	const icons = useIcons()
	const handleClose = () => {
		setShow(false);
	}
	const handleShow = () => setShow(true);
	const hiddenInput = useRef()
	
	function deleteRole(deleteRole) {
		if (window.confirm('Really delete the role '+deleteRole + '?')) {
			let roles = []
			try {
				roles = JSON.parse(localStorage.getItem('voice2llm_roles'))
			} catch (e) {roles = []}
			console.log(roles)
			if (!Array.isArray(roles)) roles = []
			let useRole = -1
			roles.map(function(role, roleKey) {
				console.log(role,roleKey)
				if (role.name === deleteRole) {
					useRole = roleKey
				}
			})
			if (useRole!==-1 && roles[useRole]) {
				roles.splice(useRole,1)
				setRoles(roles)
			}
		} 
	}
	
	return (
		<>
		  <Button variant="primary" style={{float:'left', borderRight:'1px solid black'}} onClick={handleShow} >{icons.team}</Button>
		 

		  <Modal
			show={show}
			onHide={handleClose}
		  >
			<Modal.Header closeButton>
			  <Modal.Title style={{marginRight:'2em'}}>Load a Prompt 
			  
			  </Modal.Title>
			  
			</Modal.Header>
			<Modal.Body>
			<Button style={{float:'right', marginLeft:'1em'}} variant="primary" onClick={exportRoles} >Export</Button>
			<span style={{float:'right'}} >
				<Form.Control type="file" style={{ display: 'none' }} ref={hiddenInput} onChange={importRoles} />
				<Button variant="success" as="label" htmlFor="formFile" onClick={function() {hiddenInput.current.click()}} >
				  Import
				</Button>
			</span>
			  <div style={{clear:'both', marginBottom:'0.4em'}} />
			  
			   <ListGroup>
				  {Array.isArray(roles) && roles.map(function(role) {
					 return <ListGroup.Item  ><span onClick={function() {loadRole(role.name); handleClose()}}> {role.name}</span><Button style={{float:'right'}} variant="danger" onClick={function() {deleteRole(role.name)}} >{icons.bin}</Button></ListGroup.Item> 
				  })}
				  
				</ListGroup>
			</Modal.Body>
			
		  </Modal>
		</>
	)
}
