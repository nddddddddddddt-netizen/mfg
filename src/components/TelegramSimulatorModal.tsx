import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  Send,
  X,
  RotateCcw,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { api } from '../services/api.ts';

interface TelegramButton {
  text: string;
  callback_data: string;
}

interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  keyboard?: TelegramButton[][];
  time: string;
}

interface TelegramSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TelegramSimulatorModal: React.FC<TelegramSimulatorModalProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initialize with /start on open
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      handleSend('/start');
    }
  }, [isOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (!isOpen) return null;

  const handleSend = async (customText?: string) => {
    const textToSend = customText !== undefined ? customText : inputText;
    if (!textToSend.trim()) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      sender: 'user',
      text: textToSend,
      time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (customText === undefined) setInputText('');
    setIsSending(true);

    try {
      const res = await api.telegramInteract({
        chatId: 'web_simulator_user',
        message: textToSend,
      });

      const botMsg: ChatMessage = {
        id: crypto.randomUUID(),
        sender: 'bot',
        text: res.text || '',
        keyboard: res.keyboard,
        time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          sender: 'bot',
          text: `⚠️ خطأ: ${err.message}`,
          time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleCallbackClick = async (callbackData: string) => {
    setIsSending(true);
    try {
      const res = await api.telegramInteract({
        chatId: 'web_simulator_user',
        callbackData,
      });

      const botMsg: ChatMessage = {
        id: crypto.randomUUID(),
        sender: 'bot',
        text: res.text || '',
        keyboard: res.keyboard,
        time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  const handleResetChat = () => {
    setMessages([]);
    handleSend('/start');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="flex h-[620px] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        {/* Telegram Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-5 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-500 text-white shadow-md shadow-sky-500/20">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                TikSpark Automation Bot
                <span className="rounded bg-sky-500/20 px-1.5 py-0.2 text-[10px] font-bold text-sky-400">
                  v3.2
                </span>
              </h3>
              <p className="text-[11px] text-emerald-400 font-medium">متصل ومتاح للتفاعل الحقيقي</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetChat}
              title="إعادة ضبط المحادثة"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Chat Feed */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#0b101b] scrollbar-thin scrollbar-thumb-slate-800"
        >
          {messages.map((msg) => {
            const isBot = msg.sender === 'bot';
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isBot ? 'items-start' : 'items-end'}`}
              >
                <div
                  className={`relative max-w-[85%] rounded-2xl p-3.5 text-xs shadow-md ${
                    isBot
                      ? 'bg-slate-800/90 text-slate-100 rounded-tr-none border border-slate-700/60'
                      : 'bg-gradient-to-r from-sky-600 to-sky-500 text-white rounded-tl-none font-medium'
                  }`}
                >
                  <div
                    className="whitespace-pre-wrap leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: msg.text }}
                  />
                  <div className="mt-1 text-left text-[9px] text-slate-400/80 font-mono">
                    {msg.time}
                  </div>
                </div>

                {/* Inline Keyboard Buttons */}
                {isBot && msg.keyboard && msg.keyboard.length > 0 && (
                  <div className="mt-2 flex w-full max-w-[85%] flex-col gap-1.5">
                    {msg.keyboard.map((row, rIdx) => (
                      <div key={rIdx} className="flex flex-wrap gap-1.5">
                        {row.map((btn, bIdx) => (
                          <button
                            key={bIdx}
                            onClick={() => handleCallbackClick(btn.callback_data)}
                            disabled={isSending}
                            className="flex-1 rounded-xl border border-sky-500/30 bg-slate-800/95 px-3 py-2 text-center text-xs font-bold text-sky-300 transition hover:bg-sky-500/20 active:scale-95 disabled:opacity-50"
                          >
                            {btn.text}
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {isSending && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="h-2 w-2 animate-bounce rounded-full bg-sky-400"></span>
              <span className="h-2 w-2 animate-bounce rounded-full bg-sky-400 delay-100"></span>
              <span className="h-2 w-2 animate-bounce rounded-full bg-sky-400 delay-200"></span>
              <span>البوت يكتب الآن...</span>
            </div>
          )}
        </div>

        {/* Composer */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2 border-t border-slate-800 bg-slate-950 p-3"
        >
          <input
            type="text"
            placeholder="اكتب أمراً أو رسالة (مثال: /start أو اسم المستخدم)..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isSending}
            className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none font-sans"
          />
          <button
            type="submit"
            disabled={isSending || !inputText.trim()}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500 text-white shadow-md shadow-sky-500/20 hover:bg-sky-400 active:scale-95 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
