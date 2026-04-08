import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Bot, X, Send, RotateCw, AlertTriangle, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GoogleGenerativeAI } from "@google/generative-ai";

interface AIChatPanelProps {
  currentCode: string;
  onCodeUpdate: (newCode: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  status?: 'loading' | 'success' | 'error';
}

export function AIChatPanel({ currentCode, onCodeUpdate, isOpen, onClose }: AIChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !selectedImage) || isProcessing) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };
    
    // Add image preview to message if exists (for UI only in this MVP, 
    // ideally we'd store attachment structure in Message type)
    if (selectedImage) {
      userMessage.content = input ? `${input} [Image Attached]` : "[Image Attached]";
    }

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    const imageToSend = selectedImage; // Capture current image before clearing
    setSelectedImage(null);
    setIsProcessing(true);

    // AI Interaction with Gemini
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("API Key is missing. Please check your .env file.");
      }
      
      const genAI = new GoogleGenerativeAI(apiKey);
      // Use Gemini 2.5 Flash as requested
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      let result;
      
      if (imageToSend) {
        // Multimodal Prompt
        const base64Image = imageToSend.split(',')[1];
        
        const prompt = `
          Analyze this image and generate a valid Mermaid.js diagram code that represents it.
          
          User Request: "${input}"
          
          Instructions:
          1. Return ONLY the valid Mermaid code.
          2. Do NOT wrap the code in markdown blocks (no \`\`\`mermaid or \`\`\`).
          3. Do NOT provide explanations.
          4. Ensure syntax is valid.
        `;
        
        const imagePart = {
          inlineData: {
            data: base64Image,
            mimeType: "image/jpeg", // Assuming jpeg/png for simplicity
          },
        };

        result = await model.generateContent([prompt, imagePart]);
      } else {
        // Text-only Prompt
        const prompt = `
          You are an expert Mermaid.js diagram architect.
          Your task is to modify the following Mermaid code based on the user's request.
          
          Current Code:
          \`\`\`mermaid
          ${currentCode || 'graph TD\n    A[Start] --> B[End]'}
          \`\`\`
          
          User Request: "${input}"
          
          Instructions:
          1. Return ONLY the valid Mermaid code.
          2. Do NOT wrap the code in markdown blocks (no \`\`\`mermaid or \`\`\`).
          3. Do NOT provide explanations.
          4. Maintain the existing structure unless asked to change it.
          5. Ensure syntax is valid.
        `;
        result = await model.generateContent(prompt);
      }

      const response = await result.response;
      let text = response.text();
      
      // Cleanup code if markdown block is included
      text = text.replace(/```mermaid/g, '').replace(/```/g, '').trim();

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I've updated the architecture as requested.",
        timestamp: new Date(),
        status: 'success',
      };

      setMessages(prev => [...prev, aiMessage]);
      onCodeUpdate(text);
    } catch (error: any) {
      console.error("AI Error:", error);
      let errorMsg = "Sorry, I encountered an error processing your request.";
      
      if (error.message) {
        errorMsg += ` Details: ${error.message}`;
      }
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: errorMsg,
        timestamp: new Date(),
        status: 'error',
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-6 right-6 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden z-50"
          style={{ maxHeight: '600px' }}
        >
          {/* Header */}
          <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-blue-500 p-1.5 rounded-lg">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">AI Architect Assistant</h3>
                <p className="text-[10px] text-gray-400">Powered by Mermaid AI Core v1.1</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="text-gray-400 hover:text-white hover:bg-slate-800">
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Bot className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm font-medium">How can I help you refine this diagram?</p>
                <p className="text-xs mt-1">Try "Add a database node" or "Change styles"</p>
              </div>
            )}
            
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex w-full",
                  msg.role === 'user' ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-sm",
                    msg.role === 'user'
                      ? "bg-blue-600 text-white rounded-br-none"
                      : "bg-white border border-gray-100 text-gray-800 rounded-bl-none"
                  )}
                >
                  <p>{msg.content}</p>
                  {msg.status === 'error' && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-red-200">
                      <AlertTriangle className="w-3 h-3" />
                      <span>Error processing request</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {isProcessing && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm flex items-center gap-2">
                  <RotateCw className="w-3 h-3 animate-spin text-blue-600" />
                  <span className="text-xs text-gray-500">Refining architecture...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 bg-white border-t">
            {selectedImage && (
              <div className="mb-2 relative inline-block">
                <img src={selectedImage} alt="Preview" className="h-16 w-auto rounded-lg border border-gray-200" />
                <button 
                  onClick={() => setSelectedImage(null)}
                  className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleImageUpload}
              />
              <Button 
                type="button"
                variant="outline"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                className="text-gray-400 hover:text-blue-600"
                disabled={isProcessing}
              >
                <ImageIcon className="w-4 h-4" />
              </Button>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={selectedImage ? "Describe this image..." : "Describe your changes..."}
                className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                disabled={isProcessing}
              />
              <Button 
                type="submit" 
                size="icon" 
                className={cn(
                  "bg-blue-600 hover:bg-blue-700 text-white transition-all",
                  isProcessing && "opacity-50 cursor-not-allowed"
                )}
                disabled={isProcessing || (!input.trim() && !selectedImage)}
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
            <div className="mt-2 flex justify-between items-center text-[10px] text-gray-400">
              <span>Context: Active Slot</span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                AI Ready
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
