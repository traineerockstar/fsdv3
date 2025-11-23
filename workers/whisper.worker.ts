import { pipeline, env } from '@xenova/transformers';

// Skip local model checks to allow loading from remote HuggingFace Hub
env.allowLocalModels = false;
// Use the quantized version to save VRAM/Bandwidth
env.useBrowserCache = true;

class WhisperPipeline {
  static task = 'automatic-speech-recognition';
  static model = 'Xenova/whisper-large-v3-turbo';
  static instance: any = null;

  static async getInstance(progressCallback: any = null) {
    if (this.instance === null) {
      this.instance = await pipeline(this.task, this.model, {
        quantized: true,
        device: 'webgpu', // Prefer WebGPU, fallback is handled by library
        progress_callback: progressCallback,
      });
    }
    return this.instance;
  }
}

self.onmessage = async (event) => {
  const { type, audio } = event.data;

  if (type === 'load') {
    try {
      await WhisperPipeline.getInstance((data: any) => {
        self.postMessage({ type: 'progress', data });
      });
      self.postMessage({ type: 'ready' });
    } catch (err: any) {
      self.postMessage({ type: 'error', error: err.message });
    }
    return;
  }

  if (type === 'transcribe') {
    try {
      const transcriber = await WhisperPipeline.getInstance();
      
      // Run inference
      const output = await transcriber(audio, {
        chunk_length_s: 30,
        stride_length_s: 5,
        language: 'english',
        task: 'transcribe',
      });

      self.postMessage({
        type: 'result',
        text: output.text,
      });
    } catch (err: any) {
      self.postMessage({ type: 'error', error: err.message });
    }
  }
};