import { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send } from 'lucide-react';
import client from '../api/client';

export function ChatWidget({ userContext, language = "en" }) {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    // Simple translations
    const t = {
        en: {
            greeting: "Hi! How are you feeling today? Any pain, fatigue, or soreness I should know about? (To generate a training plan, verify your settings and press the Generate Plan button on the dashboard!)",
            placeholder: "Ask your coach...",
            connError: "Sorry, I'm having trouble connecting to the Coach Brain right now."
        },
        tr: {
            greeting: "Merhaba! Bugün nasıl hissediyorsun? Herhangi bir ağrı, yorgunluk veya bilmem gereken bir durum var mı? (Antrenman programı oluşturmak için panodaki butonları kullanabilirsin!)",
            placeholder: "Koçuna sor...",
            connError: "Üzgünüm, şu anda Coach Brain ile bağlantı kuramıyorum."
        },
        // Add others as needed
    };

    const txt = t[language] || t['en'];

    // Auto-open on mount with greeting
    useEffect(() => {
        const timer = setTimeout(() => {
            setIsOpen(true);
            if (messages.length === 0) {
                setMessages([
                    { role: 'model', content: txt.greeting }
                ]);
            }
        }, 1500);
        return () => clearTimeout(timer);
    }, []);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMsg = { role: 'user', content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput("");
        setLoading(true);

        try {
            // Send entire history + context + language
            const history = [...messages, userMsg];

            const response = await client.post('/chat/', {
                messages: history,
                user_context: userContext ? JSON.stringify(userContext) : null,
                language: language
            });

            const aiMsg = { role: 'model', content: response.data.response };
            setMessages(prev => [...prev, aiMsg]);
        } catch (err) {
            console.error("Chat error:", err);
            setMessages(prev => [...prev, { role: 'model', content: txt.connError }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none">
            {/* Chat Window */}
            {isOpen && (
                <div className="mb-4 w-80 md:w-96 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden pointer-events-auto transition-all transform origin-bottom-right">

                    {/* Header */}
                    <div className="bg-garmin-blue p-4 flex justify-between items-center text-white">
                        <div className="flex items-center gap-2">
                            <MessageSquare size={20} />
                            <span className="font-medium">Coach Chat</span>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="hover:bg-blue-600 p-1 rounded">
                            <X size={18} />
                        </button>
                    </div>

                    {/* Messages Area */}
                    <div className="h-96 overflow-y-auto p-4 bg-gray-50 dark:bg-zinc-950 space-y-4">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div
                                    className={`max-w-[80%] p-3 rounded-2xl text-sm ${msg.role === 'user'
                                            ? 'bg-garmin-blue text-white rounded-br-none'
                                            : 'bg-white dark:bg-zinc-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-bl-none shadow-sm'
                                        }`}
                                >
                                    {msg.content}
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="flex justify-start">
                                <div className="bg-white dark:bg-zinc-800 p-3 rounded-2xl rounded-bl-none border border-gray-200 dark:border-gray-700 shadow-sm">
                                    <div className="flex space-x-2">
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <form onSubmit={handleSend} className="p-4 bg-white dark:bg-zinc-900 border-t border-gray-200 dark:border-gray-800 flex gap-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder={txt.placeholder}
                            className="flex-1 bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-white rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-garmin-blue"
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || loading}
                            className="bg-garmin-blue text-white p-2 rounded-full hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <Send size={18} />
                        </button>
                    </form>
                </div>
            )}

            {/* Toggle Button (Always Visible if closed) */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="pointer-events-auto bg-garmin-blue hover:bg-blue-600 text-white p-4 rounded-full shadow-lg transition-transform hover:scale-105 flex items-center justify-center"
                >
                    <MessageSquare size={24} />
                    {messages.length === 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 w-3 h-3 rounded-full"></span>
                    )}
                </button>
            )}
        </div>
    );
}
