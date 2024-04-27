import {useState, useEffect} from 'react'

export default function useSystemMessageManager({forceRefresh}) {
	
	const defaultRoles = [
		{name:'default', message:'You are a helpful assistant', config: {}, category: ''},
		{name:'pirate', message:'You are a helpful assistant who always responds in the style of a pirate', config: {}, category: ''}
	]
	
	const [roles, setRolesInner] = useState([]) // [{name:'',message:'',config:{}}]
	async function setRoles(roles) {
		localStorage.setItem('voice2llm_roles',JSON.stringify(roles))
		setRolesInner(roles)
	}
	
	const [category, setCategoryInner] = useState('')
	async function setCategory(message) {
		localStorage.setItem('voice2llm_system_category',message)
		setCategoryInner(message)
	}
 
	const [systemMessage, setSystemMessageInner] = useState('')
	async function setSystemMessage(message) {
		localStorage.setItem('voice2llm_system_message',message)
		setSystemMessageInner(message)
	}
	
	const [systemConfig, setSystemConfigInner] = useState({})
	async function setSystemConfig(config) {
		localStorage.setItem('voice2llm_system_config',JSON.stringify(config))
		setSystemConfigInner(config)
	}
	
	const [currentRole, setCurrentRoleInner] = useState({})
	async function setCurrentRole(role) {
		localStorage.setItem('voice2llm_current_role',role)
		setCurrentRoleInner(role)
	}
	
	function init() {
		// load roles
		
		setSystemMessageInner(localStorage.getItem('voice2llm_system_message'))
		setCurrentRoleInner(localStorage.getItem('voice2llm_current_role'))
		setCategory(localStorage.getItem('voice2llm_current_category'))
		try {
			setSystemConfigInner(JSON.parse(localStorage.getItem('voice2llm_system_config')))
		} catch (e) {}
		try {
			setRolesInner(JSON.parse(localStorage.getItem('voice2llm_roles')))
		} catch (e) {
			setRoles(defaultRoles)
		}
		
	}
	
	useEffect(function() {
		init()
	},[])

	function exportRoles() {
		let roles = []
		try {
			roles = JSON.parse(localStorage.getItem('voice2llm_roles'))
			  const blob = new Blob([JSON.stringify(roles)], { type: "application/json" });
			  const url = window.URL.createObjectURL(blob);
			  const a = document.createElement("a");
			  a.href = url;
			  a.download = 'roles.json';
			  document.body.appendChild(a);
			  a.click();
			  window.URL.revokeObjectURL(url);
			  document.body.removeChild(a);
		} catch (e) {roles = []}
		if (!Array.isArray(roles)) roles = []
		return JSON.stringify(roles)
	}
	
	const handleFileChange = async (event) => {
		const file = event.target.files[0];
		const reader = new FileReader();
		reader.onload = (e) => {
		  const text = e.target.result;
		  return text
		  console.log(text); // Do something with the text content
		};
		reader.readAsText(file);
	};
	
	function importRoles(e) {
		console.log("IMPORT e",e,e.target.files)
		let roles = []
		try {
			roles = JSON.parse(localStorage.getItem('voice2llm_roles'))
		} catch (e) {roles = []}
		console.log(roles)
		if (!Array.isArray(roles)) roles = []
		let willOverwrite = 0
		const file = e.target.files[0];
		const reader = new FileReader();
		reader.onload = (e) => {
			const text = e.target.result;
			try {
				console.log("IMPORT loaded",text)
				let j = JSON.parse(text)
				if (Array.isArray(j)) {
					j.forEach(function(newRole) {
						let useRole = null
						roles.map(function(role, roleKey) {
							//console.log(role,roleKey)
							if (role.name === currentRole) {
								useRole = newRole.name
							}
						})
						if (useRole!==-1 && roles[useRole]) {
							console.log("save update",useRole, {name: currentRole, message: systemMessage, config: systemConfig, category: category})
							// update
							//if (window.confirm('You are about to save over an existing role')) {
							roles[useRole] = newRole
							//}
							willOverwrite += 1
						} else {
							// insert
							console.log("save insert", newRole)
							roles.push(newRole)
						}

				  })
			  }
			  console.log("IMPORT e",roles)
			  if (willOverwrite > 0) {
				if (window.confirm('You are about to save over '+willOverwrite+' existing roles')) {
					setRoles(roles)
					console.log("IMPORT set",roles)
					forceRefresh()
				}
			  } else {
				  setRoles(roles)
			  }
			} catch (e) {}
			
			
		}
		reader.readAsText(file);
	}
	
	function saveRole() {
		console.log("save",currentRole)
		if (currentRole) {
			
			let roles = []
			try {
				roles = JSON.parse(localStorage.getItem('voice2llm_roles'))
			} catch (e) {roles = []}
			console.log(roles)
			if (!Array.isArray(roles)) roles = []
			let useRole = -1
			roles.map(function(role, roleKey) {
				console.log(role,roleKey)
				if (role.name === currentRole) {
					useRole = roleKey
				}
			})
			if (useRole!==-1 && roles[useRole]) {
				console.log("save update",useRole, {name: currentRole, message: systemMessage, config: systemConfig, category: category})
				// update
				if (window.confirm('You are about to save over an existing role')) {
					roles[useRole] = {name: currentRole, message: systemMessage, config: systemConfig, category: category}
				}
			} else {
				// insert
				console.log("save insert", {name: currentRole, message: systemMessage, config: systemConfig, category: category})
				roles.push({name: currentRole, message: systemMessage, config: systemConfig, category: category})
			}
			setRoles(roles)
		}
	}
	
	
	function loadRole(name) {
		console.log('LOAD',name)
		if (window.confirm('Are you sure you want to discard current settings and load the role '+name + "?")) {
			let roles = []
			try {
				roles = JSON.parse(localStorage.getItem('voice2llm_roles'))
			} catch (e) {roles = []}
			console.log('LOAD',roles)
			if (!Array.isArray(roles)) roles = []
			let useRole = -1
			roles.map(function(role, ruleKey) {
				if (role.name === name) {
					useRole = ruleKey
				}
			})
			if (useRole !== -1 && roles[useRole]) {
				setSystemMessage(roles[useRole].message)
				console.log("set config",roles[useRole])
				setSystemConfig(roles[useRole].config)
				setCurrentRole(roles[useRole].name)
				setCategory(roles[useRole].category)
				forceRefresh()
			}
		}
	}
	
	return {category, setCategory, exportRoles,importRoles,setSystemMessage,systemMessage,setSystemConfig, systemConfig, init, saveRole, loadRole, roles, setRoles, currentRole, setCurrentRole}
}
