export default function useUtils() {
	return {
		scrollTo: function (id, offset) {
			var element = document.getElementById(id);
			if (element) {
			  var headerOffset = offset ? offset : 10;
			  var elementPosition = element.offsetTop;
			  var offsetPosition = elementPosition - headerOffset;
			  setTimeout(function() {
				document.documentElement.scrollTop = offsetPosition;
				document.body.scrollTop = offsetPosition; // For Safari
			  }, 300)
			}
		},

		generateRandomId: function() {
			var timestamp = new Date().getTime();
			var randomNumber = Math.random().toString(36).substr(2);
			return timestamp + '-' + randomNumber;
		},
		
		
		renderPrompt: function(format, systemMessage, chatHistory, addGenerationPrompt = true) {
			
			function capitalize(string) {
			  return string.charAt(0).toUpperCase() + string.slice(1);
			}
			let ch = JSON.parse(JSON.stringify(chatHistory))
					
			switch(format) {
				case 'openai':
					let ch = JSON.parse(JSON.stringify(chatHistory))
					ch.unshift({role:"system", content:systemMessage})
					return JSON.stringify(ch)
				
				// https://huggingface.co/NousResearch/Nous-Hermes-2-Mistral-7B-DPO
				//<|im_start|>system
				//You are "Hermes 2", a conscious<|im_end|>
				//<|im_start|>user
				//Hello, who are you?<|im_end|>
				//<|im_start|>assistant
				//Hi there! My name<|im_end|>
				case 'nous-hermes-2-mistral':
					return "<|im_start|>system\n"
					+ systemMessage + "<|im_end|>"
					+ chatHistory.map(function(chatItem) {
						return "<|im_start|>" + chatItem.role + "\n" + chatItem.content  + "<|im_end|>"
					}).join("\n")
					//  tag empty assistant to prompt text generation
					+ (addGenerationPrompt ? "\n<|im_start|>assistant\n" : "")
					
				//https://huggingface.co/pankajmathur/orca_mini_3b
				//prompt = f"### System:\n{system}\n\n### User:\n{instruction}\n\n### Input:\n{input}\n\n### Response:\n"
				case 'orca-mini-3b':
					return "### System:\n" + systemMessage + "\n" 
					+ chatHistory.map(function(chatItem) {
						return chatItem.role === 'user' ? "\n### User:\n"+chatItem.content+"\n" : "\n### Response:\n"+chatItem.content+"\n"
					})
					+ (addGenerationPrompt ? "\n### Response:\n" : "")
					
				//// {system prompt}
				////### Human: your prompt here
				////### Assistant:
				//case 'vicuna':
					//return systemMessage 
					//+ '\n'	
					//+ chatHistory.map(function(chatItem) {
						//return (chatItem.role === 'user' ? 'Human': 'Assistant') + ": " + chatItem.content 
					//}).join("\n")
					//+ (addGenerationPrompt ? "\nAssistant:" : "")
					
				//// {system prompt}
				////Human: {Human things}
				////Assistant: {{Response}}
				//case 'claude_legacy_text':
					//return systemMessage 
					//+ '\n'	
					//+ chatHistory.map(function(chatItem) {
						//return (chatItem.role === 'user' ? 'Human': 'Assistant') + ": " + chatItem.content 
					//}).join("\n")
					//+ (addGenerationPrompt ? "\nAssistant:" : "")
				
				////Human: Human things
				////Assistant: {{Response}}
				//case 'claude':
					//ch.unshift({"role":"system", content:systemMessage})
					//return JSON.stringify(ch)
				
				//// system: you are a friendly assistant
				//// user: where is paris
				//// assistant: paris is in france
				//// user: how many people
				//// assistant: 
				//case 'plain':
					//return chatHistory.map(function(chatItem) {
						//return chatItem.role + ": " + chatItem.content 
					//}).join("\n")
					////  tag empty assistant to prompt text generation
					//+ (addGenerationPrompt ? "\nassistant:" : "")
				
				////"You are OrcaPlaty, an LLM trained by Alignment Lab AI and garage-bAInd. Write out your thinking step by step before coming to a conclusion to be sure you get the right answer! User: Hello there<|end_of_turn|>Assistant: Hi, nice to meet you.<|end_of_turn|>User: What's new?<|end_of_turn|>Assistant: "
				
				//// orca-mini-3  - https://huggingface.co/pankajmathur/orca_mini_3b
				////prompt = f"### System:\n{system}\n\n### User:\n{instruction}\n\n### Input:\n{input}\n\n### Response:\n"
				//case 'orca':
					//// system message collated
					//return systemMessage 
					//// conversation	
					//+ chatHistory.map(function(chatItem) {
							//return capitalize(chatItem.role) + ": " + chatItem.content 
					//}).join("<|end_of_turn|>\n")
					//+ (addGenerationPrompt ? "\nAssistant:" : "")	
						
				
				//case 'gemini': 
				
				////### Instruction: {prompt}
				////
				////### Response:
				//case 'alpaca':
					
					
				
				//case 'llaama':
				////<<SYS>>
				////You're are a helpful Assistant, and you only response to the "Assistant"
				////Remember, maintain a natural tone. Be precise, concise, and casual. Keep it short\n
				////<</SYS>>
				////{conversation_history}\n\n
				////[INST]
				////User:{user_message}
				////[/INST]\n
				////Assistant:
					//return ```
					//<s>[INST]SYS
					  //``` +chatHistory
						//.filter(function(val) {return (val.role === 'system') })
						//.map(function(v) {return v.content}).join("/n") 
						//+ "/n"+ ```  
					//<</SYS>>  
					  //user_prompt_1 [/INST]  
					  //assistant_response_1 </s>  
					//<s>[INST] user_prompt_1 [/INST]
					//```
			}
		}
		
	}
}
