import { useStore } from "@/store/storeProvider";
import { useRef } from "react";

interface PlayerOptions {
	onAllAudioEnd?: () => void;
}

export function usePlayer({ onAllAudioEnd }: PlayerOptions = {}) {
	const { live2dStore } = useStore();
	const audioContext = useRef<AudioContext | null>(null);
	const source = useRef<AudioBufferSourceNode | null>(null);
	const audioChunks = useRef<Float32Array[]>([]);
	const nextStartTime = useRef<number>(0);
	const analyser = useRef<AnalyserNode | null>(null);
	const animationFrame = useRef<number | null>(null);
	const lastMouthOpenY = useRef<number>(0);
	const minValue = useRef<number>(255);
	const maxValue = useRef<number>(0);
	const smoothingFactor = 0.3;
	const isPlayingChunk = useRef<boolean>(false);
	const debounceTimer = useRef<NodeJS.Timeout | null>(null);

	const debouncedEndCallback = () => {
		if (debounceTimer.current) {
			clearTimeout(debounceTimer.current);
		}
		debounceTimer.current = setTimeout(() => {
			if (audioChunks.current.length === 0 && !isPlayingChunk.current) {
				onAllAudioEnd?.();
			}
		}, 3000);
	};

	function initAudioContext() {
		if (!audioContext.current) {
			audioContext.current = new AudioContext({ sampleRate: 44100, latencyHint: 'interactive' });
			nextStartTime.current = audioContext.current.currentTime;
			if (live2dStore.model) {
				analyser.current = audioContext.current.createAnalyser();
				analyser.current.fftSize = 2048;
				live2dStore.model.internalModel?.coreModel?.setParameterValueById?.('ParamMouthOpenY', 0);
			}
		}
	}

	function updateMouthMovement() {
		if (!analyser.current || !live2dStore.model) return;
		const frequencyData = new Uint8Array(analyser.current.frequencyBinCount);
		analyser.current.getByteFrequencyData(frequencyData);
		const arr = [];
		const step = 40;
		for (let i = 0; i < 600; i += step) {
			arr.push(frequencyData[i]);
		}
		const averageFrequency = arr.reduce((sum, val) => sum + val, 0) / arr.length;
		minValue.current = Math.min(minValue.current, averageFrequency);
		maxValue.current = Math.max(maxValue.current, averageFrequency);
		minValue.current += 0.05;
		maxValue.current -= 0.05;
		if (maxValue.current - minValue.current < 50) {
			const mid = (maxValue.current + minValue.current) / 2;
			minValue.current = mid - 15;
			maxValue.current = mid + 15;
		}
		let normalizedValue = (averageFrequency - minValue.current) / (maxValue.current - minValue.current);
		normalizedValue = Math.max(0, Math.min(1, normalizedValue));
		const smoothedValue = lastMouthOpenY.current + smoothingFactor * (normalizedValue - lastMouthOpenY.current);
		lastMouthOpenY.current = smoothedValue;
		if(smoothedValue > 0 && smoothedValue < 1) {
			live2dStore.model.internalModel?.coreModel?.setParameterValueById?.('ParamMouthOpenY', smoothedValue);
		}
		animationFrame.current = requestAnimationFrame(updateMouthMovement);
	}

	async function playNextChunk() {
		if (audioChunks.current.length > 0 && audioContext.current) {
			isPlayingChunk.current = true;
			const chunk = audioChunks.current.shift()!;
			try {
				const audioBuffer = audioContext.current.createBuffer(1, chunk.length, 44100);
				audioBuffer.copyToChannel(chunk, 0);
				source.current = audioContext.current.createBufferSource();
				source.current.buffer = audioBuffer;
				if (live2dStore.model && analyser.current) {
					source.current.connect(analyser.current);
					analyser.current.connect(audioContext.current.destination);
					updateMouthMovement();
				} else {
					source.current.connect(audioContext.current.destination);
				}
				source.current.start(nextStartTime.current);
				nextStartTime.current += audioBuffer.duration;

				source.current.onended = () => {
					isPlayingChunk.current = false;
					if (audioChunks.current.length === 0) {
						debouncedEndCallback();
					} else {
						playNextChunk();
					}
				};
			} catch (error) {
				console.error('解码音频数据时出错:', error);
				isPlayingChunk.current = false;
				if (audioChunks.current.length > 0) {
					playNextChunk();
				} else {
					nextStartTime.current = 0;
					debouncedEndCallback();
				}
			}
		}
	}

	function addChunk(base64Chunk: string) {
		const binaryString = atob(base64Chunk);
		const bytes = new Uint8Array(binaryString.length);
		for (let i = 0; i < binaryString.length; i++) {
			bytes[i] = binaryString.charCodeAt(i);
		}
		const float32Array = new Float32Array(bytes.length / 2);
		for (let i = 0; i < float32Array.length; i++) {
			const int16 = (bytes[i * 2] & 0xff) | (bytes[i * 2 + 1] << 8);
			float32Array[i] = int16 >= 0x8000 ? (int16 - 0x10000) / 32768.0 : int16 / 32767.0;
		}
		audioChunks.current.push(float32Array);
		initAudioContext();
		playNextChunk();
	}

	function stop() {
		if (animationFrame.current) {
			cancelAnimationFrame(animationFrame.current);
			animationFrame.current = null;
		}
		if (debounceTimer.current) {
			clearTimeout(debounceTimer.current);
			debounceTimer.current = null;
		}
		source.current?.stop();
		audioContext.current?.close();
		audioContext.current = null;
		analyser.current = null;
		audioChunks.current = [];
		nextStartTime.current = 0;
		isPlayingChunk.current = false;
		if (live2dStore.model) {
			live2dStore.model.internalModel?.coreModel?.setParameterValueById?.('ParamMouthOpenY', 0);
		}
	}

	return {
		stop,
		addChunk,
	};
}
