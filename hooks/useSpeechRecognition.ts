import { useState, useEffect, useRef, useCallback } from 'react';
import WhisperWorker from '../workers/whisper.worker.ts?worker';

interface UseSpeechRecognitionProps {
  onResult: (transcript: string) => void;
  continuous?: boolean; // Kept for API compatibility, though local whisper usually works in chunks
  interimResults?: boolean;
}

export const useSpeechRecognition = ({ onResult }: UseSpeechRecognitionProps) => {
  const [isListening, setIsListening] = useState(false);
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true); // Assume true for modern browsers with WebGPU/WASM

  const worker = useRef<Worker | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const mediaStream = useRef<MediaStream | null>(null);
  const scriptProcessor = useRef<ScriptProcessorNode | null>(null);
  
  // Buffer to store audio data before sending to worker
  const audioBufferRef = useRef<Float32Array>(new Float32Array(0));
  
  // Use ref for callback to avoid re-initializing worker on every render
  const onResultRef = useRef(onResult);
  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    // Initialize Worker using Vite import
    worker.current = new WhisperWorker();

    worker.current.onmessage = (event) => {
      const { type, text, error: workerError } = event.data;
      if (type === 'ready') {
        setIsModelLoading(false);
      } else if (type === 'result') {
        if (onResultRef.current) {
            onResultRef.current(text);
        }
      } else if (type === 'error') {
        setError(workerError);
        setIsListening(false);
      }
    };

    // Trigger model load immediately
    worker.current.postMessage({ type: 'load' });

    return () => {
      worker.current?.terminate();
    };
  }, []); // Empty dependency array - worker only inits once

  /**
   * Downsamples audio data from source sample rate to 16000Hz
   */
  const downsampleBuffer = (buffer: Float32Array, sampleRate: number, outSampleRate: number) => {
    if (outSampleRate === sampleRate) {
      return buffer;
    }
    if (outSampleRate > sampleRate) {
      throw new Error('Downsampling rate show be smaller than original sample rate');
    }
    const sampleRateRatio = sampleRate / outSampleRate;
    const newLength = Math.round(buffer.length / sampleRateRatio);
    const result = new Float32Array(newLength);
    let offsetResult = 0;
    let offsetBuffer = 0;
    while (offsetResult < result.length) {
      const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
      // Use average value of skipped samples
      let accum = 0, count = 0;
      for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
        accum += buffer[i];
        count++;
      }
      result[offsetResult] = accum / count;
      offsetResult++;
      offsetBuffer = nextOffsetBuffer;
    }
    return result;
  };

  const processAudio = useCallback((inputData: Float32Array) => {
    // Append new data to buffer
    const newBuffer = new Float32Array(audioBufferRef.current.length + inputData.length);
    newBuffer.set(audioBufferRef.current);
    newBuffer.set(inputData, audioBufferRef.current.length);
    audioBufferRef.current = newBuffer;
  }, []);

  const startListening = useCallback(async () => {
    if (isListening || isModelLoading) return;
    setError(null);
    audioBufferRef.current = new Float32Array(0); // Reset buffer

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStream.current = stream;

      // Create Audio Context
      // We keep standard sample rate here and downsample manually to ensure compatibility
      audioContext.current = new window.AudioContext();
      const source = audioContext.current.createMediaStreamSource(stream);

      // Use ScriptProcessor for broad compatibility (AudioWorklet is better but requires separate file logic in pure React setups without dedicated public folder setup sometimes)
      // Buffer size 4096 gives reasonable latency/performance balance
      const processor = audioContext.current.createScriptProcessor(4096, 1, 1);
      scriptProcessor.current = processor;

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        // We clone the data because inputBuffer is reused
        const rawData = new Float32Array(inputData);
        
        // Downsample immediately to save memory, or store raw? 
        // Storing raw and downsampling at the end is safer for quality, 
        // but downsampling chunks saves memory. Let's downsample chunks.
        const downsampled = downsampleBuffer(rawData, audioContext.current!.sampleRate, 16000);
        processAudio(downsampled);
      };

      source.connect(processor);
      processor.connect(audioContext.current.destination);

      setIsListening(true);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Microphone access denied');
    }
  }, [isListening, isModelLoading, processAudio]);

  const stopListening = useCallback(() => {
    if (!isListening) return;

    // Stop Stream
    mediaStream.current?.getTracks().forEach(track => track.stop());
    
    // Disconnect Audio Nodes
    if (scriptProcessor.current && audioContext.current) {
        scriptProcessor.current.disconnect();
        audioContext.current.close();
    }

    setIsListening(false);

    // Send buffered audio to worker
    if (worker.current && audioBufferRef.current.length > 0) {
      worker.current.postMessage({
        type: 'transcribe',
        audio: audioBufferRef.current,
      });
    }
  }, [isListening]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  return {
    isListening,
    toggleListening,
    error,
    isSupported,
    isModelLoading
  };
};