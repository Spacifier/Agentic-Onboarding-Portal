import React, { useEffect, useRef, useState } from "react";
import "./ChatPage.css";
import { useNavigate } from "react-router-dom";

function ChatPage() {
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem("chatHistory");
    return saved ? JSON.parse(saved) : [
      { type: "bot", text: "👋 Hi! I'm your Smart Financial Assistant. How can I help you today?" },
    ];
  });

  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);
  const navigate = useNavigate();

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
    localStorage.setItem("chatHistory", JSON.stringify(messages));
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const token = localStorage.getItem("accessToken");
    const newMessage = { type: "user", text: input };
    setMessages((prev) => [...prev, newMessage]);
    setInput("");
    setIsTyping(true);

    try {
      const res = await fetch("https://agentic-onboarding-backend.onrender.com/api/v1/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: input }),
      });

      const data = await res.json();
      setIsTyping(false);

      if (data.reply) {
        setMessages((prev) => [...prev, { type: "bot", text: data.reply }]);
      }

      if (data.options && Array.isArray(data.options)) {
        data.options.forEach((option) => {
          setMessages((prev) => [
            ...prev,
            {
              type: "button",
              label: option.label,
              route: option.route,
            },
          ]);
        });
      }
    } catch (error) {
      console.error("Chat error:", error);
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        { type: "bot", text: "⚠️ Sorry, something went wrong." },
      ]);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSend();
  };

  const handleRouteClick = (route) => {
    navigate(route);
  };

  const resetChat = () => {
    localStorage.removeItem("chatHistory");
    setMessages([
      { type: "bot", text: "👋 Hi! I'm your Smart Financial Assistant. How can I help you today?" },
    ]);
  };

  const BotIcon = () => (
    <svg viewBox="0 0 24 24" className="avatar" fill="#1e4eb2" width="32" height="32">
      <circle cx="12" cy="12" r="10" fill="#1e4eb2" />
      <circle cx="9" cy="10" r="1.5" fill="#fff" />
      <circle cx="15" cy="10" r="1.5" fill="#fff" />
      <path d="M8 15c1.3 1 2.7 1 4 0" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );

  return (
    <div className="chat-page">
      <div className="chat-window">
        <div className="chat-header">
          Smart Onboarding Chat
          <button onClick={resetChat} className="reset-button">Reset</button>
        </div>

        <div className="chat-body">
          {messages.map((msg, i) => (
            <div key={i} className={`message ${msg.type}`}>
              {msg.type !== "button" && (
                msg.type === "bot" ? <BotIcon /> :
                <div className="avatar user-avatar">🧑</div>
              )}
              {msg.type === "button" ? (
                <button className="option-button" onClick={() => handleRouteClick(msg.route)}>
                  {msg.label}
                </button>
              ) : (
                <span>{msg.text}</span>
              )}
            </div>
          ))}

          {isTyping && (
            <div className="message bot typing-indicator">
              <BotIcon />
              <span className="dot-flash"></span>
              <span className="dot-flash"></span>
              <span className="dot-flash"></span>
            </div>
          )}

          <div ref={chatEndRef}></div>
        </div>

        <div className="chat-input">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
          />
          <button onClick={handleSend}>Send</button>
        </div>
      </div>
    </div>
  );
}

export default ChatPage;
