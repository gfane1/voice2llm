import {useState, useEffect, useRef} from 'react'

export default function useOpenAiUsageLogger() {
	
	const pricing = {
	  "gpt-4-turbo-2024-04-09": {
		"price_in": "10.00",
		"price_out": "30.00"
	  },
	  "gpt-4": {
		"price_in": "30.00",
		"price_out": "60.00"
	  },
	  "gpt-4-32k": {
		"price_in": "60.00",
		"price_out": "120.00"
	  },
	  "gpt-3.5-turbo-0125": {
		"price_in": "0.50",
		"price_out": "1.50"
	  },
	  "gpt-3.5-turbo-instruct": {
		"price_in": "1.50",
		"price_out": "2.00"
	  },
	  "davinci-002": {
		"price_in": "2.00",
		"price_out": "2.00",
	  },
	  "babbage-002": {
		"price_in": "0.40",
		"price_out": "0.40",
	  }
	}
	
	function getSttPrice(seconds) {
		return (0.006/60) * parseInt(seconds)
	}
	
	function getTtsPrice(characters) {
		return parseInt(characters)/1000000 * 15
	}
	
	const [totals, setTotals] = useState({})
	
	function getTotal() {
		let total = 0
		try {
			let logEntries = JSON.parse(localStorage.getItem("openai_log"))
			//console.log(logEntries)
			logEntries.map(function(logEntry) {
				if (logEntry && logEntry.model && pricing[logEntry.model] && (logEntry.tokens_in > 0 ||logEntry.tokens_out > 0 )) {
					total += parseFloat(pricing[logEntry.model].price_in) * logEntry.tokens_in / 1000000
					total += parseFloat(pricing[logEntry.model].price_out) * logEntry.tokens_out / 1000000
					//console.log("add",total,pricing[logEntry.model].price_in ,logEntry.tokens_in, pricing[logEntry.model].price_out,logEntry.tokens_out)
				}
			})
		} catch (e) {}
		try {
			let logEntries = JSON.parse(localStorage.getItem("openai_log_stt"))
			//console.log(logEntries)
			logEntries.map(function(logEntry) {
				if (logEntry && logEntry.model && logEntry.seconds > 0) {
					total += getSttPrice(logEntry.seconds)
					//console.log("add stt",total,getSttPrice(logEntry.seconds))
				}
			})
		} catch (e) {}
		try {
			let logEntries = JSON.parse(localStorage.getItem("openai_log"))
			//console.log(logEntries)
			logEntries.map(function(logEntry) {
				if (logEntry && logEntry.model && logEntry.letters > 0) {
					total += getTtsPrice(logEntry.letters)
					//console.log("add tts",total,getTtsPrice(logEntry.seconds))
				}
			})
		} catch (e) {}
		return total.toLocaleString('en-US', {
			style: 'currency',
			currency: 'USD'
		  });
	}
	
	function log({tokens_in, tokens_out, model, key}) {
		let logEntries
		try {
			logEntries = JSON.parse(localStorage.getItem("openai_log"))
		} catch (e) {
			
		}
		if (!Array.isArray(logEntries))  {
			logEntries = []
		}
		logEntries.push({date: new Date(), tokens_in, tokens_out, model, key})
		//console.log("LOG llm",tokens_in, tokens_out, model)
		localStorage.setItem("openai_log",JSON.stringify(logEntries))
	}
	
	function logSTT({seconds, model, key}) {
		let logEntries
		try {
			logEntries = JSON.parse(localStorage.getItem("openai_log_stt"))
		} catch (e) {
			
		}
		if (!Array.isArray(logEntries))  {
			logEntries = []
		}
		logEntries.push({date: new Date(), seconds:  Math.round(seconds), model, key})
		//console.log("LOG stt",{seconds, model, key})
		localStorage.setItem("openai_log_stt",JSON.stringify(logEntries))
	}
	
	function logTTS({letters, model, key}) {
		let logEntries
		try {
			logEntries = JSON.parse(localStorage.getItem("openai_log_tts"))
		} catch (e) {
			
		}
		if (!Array.isArray(logEntries))  {
			logEntries = []
		}
		logEntries.push({date: new Date(), letters, model, key})
		//console.log("LOG tts",{letters, model, key})
		localStorage.setItem("openai_log_tts",JSON.stringify(logEntries))
	}
	
	return {pricing, totals, log, getTotal, logSTT, logTTS}
}
