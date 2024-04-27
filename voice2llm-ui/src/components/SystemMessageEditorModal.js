import {React, useState} from 'react'
import {Button, Modal, Form} from 'react-bootstrap'

import useIcons from '../useIcons'

import SystemMessageForm from './SystemMessageForm'
import LoadRoleModal from './LoadRoleModal'

export default function SystemMessageEditorModal({saveRole, loadRole, systemConfig, setSystemConfig, roles, setRoles, category, setCategory, systemMessage, setSystemMessage,chatHistory, setChatHistory, currentRole, setCurrentRole, importRoles, exportRoles}) {
	const [show, setShow] = useState(false);
	const icons = useIcons()
	const handleClose = () => {
		setShow(false);
	}
	const handleShow = () => setShow(true);
	const l = currentRole ? currentRole : (systemMessage ? (systemMessage.slice(0,40) +(systemMessage.length > 40 ? "..." : '')) : '')

	return (
		<>
		  <Button variant="outline-primary" onClick={handleShow}>
			{icons.pencil} {l}
		  </Button>

		  <Modal
			show={show}
			onHide={handleClose}
		  >
			<Modal.Header closeButton>
			  <Modal.Title style={{marginRight:'2em'}}>Prompt Config</Modal.Title>
			 
			</Modal.Header>
			<Modal.Body>
			<div style={{width:'100%',clear:'both'}} ></div>
			<Button variant="danger" style={{float:'right', marginLeft:'2em', marginBottom:'0.3em'}} onClick={saveRole} >{icons.save}</Button>
			
			<LoadRoleModal importRoles={importRoles} exportRoles={exportRoles} loadRole={loadRole} roles={roles} setRoles={setRoles} />
			
			 <div style={{width:'100%',clear:'both'}} ></div>	
			  <SystemMessageForm roles={roles} category={category} setCategory={setCategory}  systemMessage={systemMessage} setSystemMessage={setSystemMessage} chatHistory={chatHistory} setChatHistory={setChatHistory}  systemConfig={systemConfig} setSystemConfig={setSystemConfig} currentRole={currentRole} setCurrentRole={setCurrentRole}  />
			  

			</Modal.Body>
			
		  </Modal>
		</>
	)
}
