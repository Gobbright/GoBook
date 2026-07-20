import { useEffect, useRef, useState } from 'react';
import { Bot, Send, X } from 'lucide-react';

import { apiClient } from '../../services/apiClient.js';

const QUICK_PROMPTS = [
  'Sales prediction for this month',
  'Top customers by sales',
  'Low stock items',
];

const WELCOME_MESSAGE = "Hi! I'm your GoBook AI assistant. Ask a question or try a quick prompt below.";

export function AiAssistantWidget() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([{ from: 'bot', text: WELCOME_MESSAGE }]);
  const [thinking, setThinking] = useState(false);
  const bodyRef = useRef(null);

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [messages, open, thinking]);

  async function respond(question) {
    const text = question.trim();
    if (!text || thinking) return;

    const history = messages.map((m) => ({ role: m.from === 'bot' ? 'assistant' : 'user', content: m.text }));

    setMessages((m) => [...m, { from: 'user', text }]);
    setQuery('');
    setThinking(true);

    try {
      const data = await apiClient('/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ message: text, history }),
      });
      setMessages((m) => [...m, { from: 'bot', text: data.reply }]);
    } catch {
      setMessages((m) => [...m, { from: 'bot', text: "Sorry, I couldn't reach the AI service. Please try again." }]);
    } finally {
      setThinking(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    respond(query);
  }

  return (
    <>
      {open && (
        <div className="fixed left-3 right-3 sm:left-auto sm:right-5 z-50 w-auto sm:w-96 bg-white border border-[#dfe7f1] rounded-xl shadow-xl flex flex-col max-h-[calc(100dvh-132px)] sm:max-h-[70vh] overflow-hidden" style={{ bottom: 108 }}>
          <div className="flex items-center justify-between px-4 py-3 bg-[#062844] text-white">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center flex-none">
                <Bot size={16} />
              </div>
              <div>
                <div className="text-[13px] font-semibold leading-tight">AI Assistant</div>
                <div className="text-[11px] text-[#c8dff2] leading-tight">Always here to help</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-white/80 hover:text-white bg-transparent border-0 cursor-pointer p-1"
              aria-label="Close AI assistant"
            >
              <X size={16} />
            </button>
          </div>

          <div ref={bodyRef} className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 min-h-50">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] text-[12.5px] leading-snug rounded-lg px-3 py-2 whitespace-pre-line ${
                  m.from === 'bot'
                    ? 'bg-[#f1f5f9] text-[#111827] self-start'
                    : 'bg-blue-600 text-white self-end'
                }`}
              >
                {m.text}
              </div>
            ))}
            {thinking && (
              <div className="max-w-[85%] text-[12.5px] leading-snug rounded-lg px-3 py-2 bg-[#f1f5f9] text-[#94a3b8] self-start">
                Thinking…
              </div>
            )}
          </div>

          <div className="px-3 pb-2 flex flex-wrap gap-1.5">
            {QUICK_PROMPTS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => respond(p)}
                disabled={thinking}
                className="text-[11px] px-2.5 py-1 rounded-full border border-[#dbe4ef] text-[#536173] hover:border-blue-300 hover:text-blue-600 bg-transparent cursor-pointer font-[inherit] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {p}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="p-3 border-t border-[#edf2f7] flex items-center gap-2">
            <input
              className="flex-1 border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit]"
              placeholder="Ask about sales, stock, customers..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={thinking}
            />
            <button
              type="submit"
              disabled={thinking}
              className="w-9 h-9 rounded-md bg-blue-600 flex items-center justify-center border-0 cursor-pointer flex-none hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Send"
            >
              <Send size={15} className="text-white" />
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="fixed right-4 sm:right-5 z-50 w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-[#062844] hover:bg-[#0a3a5e] text-white flex items-center justify-center shadow-lg cursor-pointer border-0 transition-transform hover:scale-105"
        style={{ bottom: 42 }}
        aria-label={open ? 'Close AI assistant' : 'Open AI assistant'}
      >
        {open ? <X size={22} /> : <Bot size={22} />}
      </button>
    </>
  );
}
