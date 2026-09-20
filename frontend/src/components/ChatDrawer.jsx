import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles, Bot, User, Wrench, ChevronDown, ChevronUp, MapPin, IndianRupee, ArrowRight } from 'lucide-react';
import { chatWithAgent } from '../services/api';

const QUICK_PROMPTS = [
  "Recommend spicy vegetarian food near Dharampeth under ₹200",
  "Find Maharashtrian breakfast options under ₹100",
  "Where can I find authentic fiery Saoji mutton in Mahal?",
  "Suggest top South Indian dosa spots in Sadar"
];

export default function ChatDrawer({ isOpen, onClose, onSelectFood }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Namaste! I'm **LocalBite AI**, your personal Nagpur food concierge. Tell me what you're craving, your budget, or your preferred locality (like Dharampeth, Sadar, or Sitabuldi), and I'll find the best match!",
      tools: [],
      items: [],
      mode: 'ready'
    }
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [expandedTools, setExpandedTools] = useState({});
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const handleSend = async (textToSend) => {
    const text = textToSend || inputText;
    if (!text.trim() || isLoading) return;

    const userMsg = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInputText("");
    setIsLoading(true);

    try {
      // Build history for backend
      const history = messages
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => ({ role: m.role, content: m.content }));

      const res = await chatWithAgent(text, history);

      const botMsg = {
        role: 'assistant',
        content: res.reply,
        items: res.recommended_items || [],
        tools: res.tools_executed || [],
        mode: res.ai_mode
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: "Sorry, I ran into a communication issue connecting to the recommendation agent. Please ensure the backend is running and try again.",
          tools: [],
          items: [],
          mode: 'error'
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleToolExpand = (msgIdx) => {
    setExpandedTools(prev => ({ ...prev, [msgIdx]: !prev[msgIdx] }));
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-stone-900/40 backdrop-blur-sm animate-fadeIn">
      <div 
        className="w-full max-w-lg bg-cream-50 h-full flex flex-col shadow-2xl border-l border-cream-300 animate-slideLeft"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="px-5 py-4 bg-white border-b border-cream-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-forest-900 flex items-center justify-center text-white shadow-sm">
              <Bot className="w-5 h-5 text-spice-500" />
            </div>
            <div>
              <h3 className="font-extrabold text-forest-950 text-base leading-tight">
                LocalBite AI Agent
              </h3>
              <p className="text-xs text-stone-500 font-medium">
                LangChain Tool-Calling Concierge
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-stone-400 hover:text-stone-700 hover:bg-cream-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              
              {/* Bubble */}
              <div className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-forest-900 text-white shadow-sm rounded-tr-none'
                  : 'bg-white text-stone-800 shadow-soft border border-cream-200 rounded-tl-none'
              }`}>
                {/* Message text with basic markdown formatting */}
                <div className="space-y-1.5 whitespace-pre-wrap">
                  {msg.content}
                </div>

                {/* Tool execution trace badge */}
                {msg.tools && msg.tools.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-cream-200 text-xs text-stone-600">
                    <button
                      type="button"
                      onClick={() => toggleToolExpand(idx)}
                      className="flex items-center space-x-1 font-bold text-forest-800 hover:text-forest-950 transition-colors"
                    >
                      <Wrench className="w-3.5 h-3.5 text-spice-600" />
                      <span>{msg.tools.length} Tool{msg.tools.length > 1 ? 's' : ''} Executed</span>
                      {expandedTools[idx] ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                    {expandedTools[idx] && (
                      <div className="mt-2 p-2 bg-cream-100 rounded-xl space-y-1.5 font-mono text-[11px]">
                        {msg.tools.map((t, tIdx) => (
                          <div key={tIdx} className="border-b border-cream-200 pb-1 last:border-0 last:pb-0">
                            <span className="font-bold text-spice-700">{t.tool}</span>: {t.summary}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Inline Food Recommendation Cards inside Chat */}
              {msg.items && msg.items.length > 0 && (
                <div className="mt-2.5 w-full max-w-[85%] space-y-2">
                  <div className="text-[11px] font-bold text-stone-400 uppercase tracking-wider pl-1">
                    AI Suggested Food Cards
                  </div>
                  {msg.items.slice(0, 3).map((food) => (
                    <div
                      key={food.restaurant_id}
                      onClick={() => onSelectFood(food)}
                      className="p-3 bg-white hover:bg-forest-50/50 rounded-xl border border-cream-300 shadow-sm cursor-pointer transition-all flex items-center justify-between group"
                    >
                      <div>
                        <div className="font-bold text-forest-950 text-xs group-hover:text-spice-600">
                          {food.dish_name}
                        </div>
                        <div className="text-[11px] text-stone-500 font-medium flex items-center space-x-1.5 mt-0.5">
                          <span>{food.restaurant_name}</span>
                          <span>•</span>
                          <span className="flex items-center">
                            <MapPin className="w-3 h-3 mr-0.5" />
                            {food.locality}
                          </span>
                        </div>
                      </div>
                      <div className="text-right flex items-center space-x-2">
                        <div className="font-black text-forest-900 text-xs">
                          ₹{Math.round(food.price)}
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-forest-900 group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>
          ))}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex items-center space-x-2 p-3 bg-white rounded-2xl rounded-tl-none border border-cream-200 max-w-[70%] text-stone-500 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-forest-800 animate-bounce" />
              <span className="w-2 h-2 rounded-full bg-spice-600 animate-bounce [animation-delay:0.2s]" />
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-bounce [animation-delay:0.4s]" />
              <span className="pl-1">Consulting Nagpur food knowledge...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Prompt Quick Buttons */}
        <div className="p-3 bg-cream-100 border-t border-cream-200 flex items-center space-x-2 overflow-x-auto no-scrollbar">
          <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider flex-shrink-0">
            Prompts:
          </span>
          {QUICK_PROMPTS.map((q, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSend(q)}
              disabled={isLoading}
              className="text-[11px] font-semibold text-stone-700 bg-white hover:bg-cream-200 px-2.5 py-1 rounded-full border border-cream-300 flex-shrink-0 transition-colors"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-4 bg-white border-t border-cream-200">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center space-x-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask for dishes, localities, or cravings..."
              className="flex-1 py-2.5 px-3.5 rounded-xl bg-cream-50 border border-cream-300 text-sm focus:outline-none focus:ring-2 focus:ring-forest-800"
            />
            <button
              type="submit"
              disabled={isLoading || !inputText.trim()}
              className="p-2.5 rounded-xl bg-forest-900 text-white hover:bg-forest-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
