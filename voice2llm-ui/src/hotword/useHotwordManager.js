import useAudioProcessor from './useAudioProcessor'
import useKeywordData from './useKeywordData'
import {React, useState, useRef} from 'react'

export default function useHotwordManager({porcupineWorkerScript, downsamplerScript, detectionCallback, errorCallback}) {
	
	
    let porcupineWorker;
	let audioProcessor = useAudioProcessor({downsamplerScript: downsamplerScript ? downsamplerScript : './hotword/downsampling_worker.js'})
	
	var keywordData = useKeywordData()
	const [isStarted, setIsStarted] = useState(false)
	const isStartedRef = useRef(false)
	//console.log(keywordData, porcupineWorkerScript, downsamplerScript, detectionCallback, errorCallback)
	
	var SENSITIVITIES = new Float32Array([
                0.5 //, // "Hey Edison"
                //0.5, // "Hot Pink"
                //0.5, // "Deep Pink"
                //0.5, // "Fire Brick"
                //0.5, // "Papaya Whip"
                //0.5, // "Peach Puff"
                //0.5, // "Sandy Brown"
                //0.5, // "Lime Green"
                //0.5, // "Forest Green"
                //0.5, // "Midnight Blue"
                //0.5, // "Magenta"
                //0.5, // "White Smoke"
                //0.5, // "Lavender Blush"
                //0.5 // "Dim Gray"
            ]);
    let start = function () {
		if (!isStartedRef.current) {
			//console.log("HWSTART")
			porcupineWorker = new Worker(porcupineWorkerScript ? porcupineWorkerScript : './hotword/porcupine_worker.js'); 
			porcupineWorker.postMessage({
				command: "init",
				keywordIDs: keywordData,
				sensitivities: SENSITIVITIES
			});

			porcupineWorker.onmessage = function (e) {
				detectionCallback(e.data.keyword);
			};

		   audioProcessor.start([this], errorCallback);
		   setIsStarted(true)
		   isStartedRef.current = true
		}
    };

    let stop = function () {
		if (isStartedRef.current) {
			//console.log("HWSTOP",audioProcessor,porcupineWorker	)
			if (audioProcessor) audioProcessor.stop();
			if (porcupineWorker) porcupineWorker.postMessage({command: "release"});
			setIsStarted(false)
			isStartedRef.current = false
		}
    };

    let processFrame = function (frame) {
		porcupineWorker.postMessage({command: "process", inputFrame: frame});
    };

    return {start: start, processFrame: processFrame, stop: stop, isStarted}
}
