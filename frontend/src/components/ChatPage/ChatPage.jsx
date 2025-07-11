import React, { useEffect, useRef, useState } from "react";
import "./ChatPage.css";
import { useNavigate } from "react-router-dom";

function ChatPage(){
  const [messages, setMessages] = useState([
    { type: "bot", text: "👋 Hi! I'm your Smart Financial Assistant. How can I help you today?" },
  ]);
  const [input, setInput] = useState("");
  const chatEndRef = useRef(null);
  const navigate = useNavigate();

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const token = localStorage.getItem("accessToken");
    console.log("TOKEN:", token); 
    const newMessage = { type: "user", text: input };
    setMessages((prev) => [...prev, newMessage]);
    setInput("");

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

  return (
    <div className="chat-page">
      <div className="chat-window">
        <div className="chat-header">Smart Onboarding Chat</div>

        <div className="chat-body">
          {messages.map((msg, i) => (
            <div key={i} className={`message ${msg.type}`}>
              {msg.type === "button" ? (
                <button className="option-button" onClick={() => handleRouteClick(msg.route)}>
                  {msg.label}
                </button>
              ) : (
                <span>{msg.text}</span>
              )}
            </div>
          ))}
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
};

export default ChatPage;
