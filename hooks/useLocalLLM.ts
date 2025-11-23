import { useState, useEffect, useRef, useCallback } from 'react';
import { CreateWebWorkerMLCEngine, MLCEngineInterface, InitProgressReport } from "@mlc-ai/web-llm";
import LLMWorker from '../workers/llm.worker.ts?worker';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export const useLocalLLM = () => {
  const [engine, setEngine] = useState<MLCEngineInterface | null>(null);
  const [progress, setProgress] = useState<string>('');
  const [loadPercentage, setLoadPercentage] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const initEngine = useCallback(async () => {
    if (engine || isLoading || isReady) return;

    setIsLoading(true);
    try {
      // Instantiate worker using Vite import syntax
      const worker = new LLMWorker();

      const engineInstance = await CreateWebWorkerMLCEngine(
        worker,
        'Llama-3-8B-Instruct-q4f32_1',
        {
          initProgressCallback: (report: InitProgressReport) => {
            setProgress(report.text);
            // Extract percentage from text if available, or estimate based on steps
            const match = report.text.match(/(\d+)%/);
            if (match) {
              setLoadPercentage(parseInt(match[1], 10));
            }
          },
        }
      );

      setEngine(engineInstance);
      setIsReady(true);
    } catch (err) {
      console.error("Failed to load LLM:", err);
      setProgress("Failed to load model.");
    } finally {
      setIsLoading(false);
    }
  }, [engine, isLoading, isReady]);

  const sendMessage = async (text: string) => {
    if (!engine || !isReady) return;

    const userMsg: ChatMessage = { role: 'user', content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setIsGenerating(true);

    try {
      const response = await engine.chat.completions.create({
        messages: newMessages,
        temperature: 0.7,
        max_tokens: 1024,
      });

      const reply = response.choices[0].message.content || "";
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      console.error("Generation error:", err);
      setMessages(prev => [...prev, { role: 'assistant', content: "Error generating response." }]);
    } finally {
      setIsGenerating(false);
    }
  };

  const resetChat = () => {
    setMessages([]);
    if (engine) {
      engine.resetChat();
    }
  };

  return {
    initEngine,
    progress,
    loadPercentage,
    isLoading,
    isReady,
    messages,
    isGenerating,
    sendMessage,
    resetChat
  };
};