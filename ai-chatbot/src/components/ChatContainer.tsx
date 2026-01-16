"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Message } from "../types/chat";
import { useAutoScroll } from "../hooks/useAutoScroll";
import ConnectionStatus from "./ConnectionStatus";
import TypingIndicator from "./TypingIndicator";
import { useWebSocket } from "../hooks/useWebSocket";

const STORAGE_KEY = "ai_chat_messages";
const THEME_KEY = "ai_chat_theme";

export default function ChatContainer() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "ai",
      content: "Hello! How can I help you?",
      timestamp: "10:00 AM",
    },
  ]);

  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const bottomRef = useAutoScroll([messages]);
  const { socketRef, connected, send } = useWebSocket("ws://localhost:8080");

  const currentAiMessageId = useRef<string | null>(null);
  const accumulatedContent = useRef("");

  const sendMessage = () => {
    if (!input.trim() || isTyping) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages((prev) => [...prev, newMessage]);
    send(input);
    setInput("");
    setIsTyping(true);

    currentAiMessageId.current = null;
    accumulatedContent.current = "";
  };

  const clearChat = () => {
    const initial: Message = {
      id: "1",
      role: "ai",
      content: "Hello! How can I help you?",
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages([initial]);
    localStorage.removeItem(STORAGE_KEY);
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  useEffect(() => {
    if (!socketRef.current) return;

    socketRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "chunk") {
        accumulatedContent.current += data.content;

        if (currentAiMessageId.current) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === currentAiMessageId.current
                ? { ...msg, content: accumulatedContent.current }
                : msg
            )
          );
        } else {
          const id = Date.now().toString();
          currentAiMessageId.current = id;

          setMessages((prev) => [
            ...prev,
            {
              id,
              role: "ai",
              content: accumulatedContent.current,
              timestamp: new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
            },
          ]);
        }
      }

      if (data.type === "done") {
        setIsTyping(false);
        currentAiMessageId.current = null;
        accumulatedContent.current = "";
      }

      if (data.type === "error") {
        setIsTyping(false);
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: "ai",
            content: "Something went wrong. Please try again.",
            timestamp: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          },
        ]);
      }
    };

    socketRef.current.onclose = () => setIsTyping(false);
  }, [socketRef]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setMessages(JSON.parse(saved));

    const theme = localStorage.getItem(THEME_KEY);
    if (theme === "dark") setDarkMode(true);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem(THEME_KEY, darkMode ? "dark" : "light");
  }, [darkMode]);

  return (
    <div
      className={`flex flex-col h-[80vh] w-full max-w-md rounded-lg shadow ${darkMode ? "bg-gray-900 text-white" : "bg-white text-black"
        }`}
    >
      <div className="p-4 border-b flex justify-between items-center">
        <span className="font-semibold">AI Chatbot</span>
        <div className="flex gap-2 items-center">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="text-xs px-2 py-1 border rounded"
          >
            {darkMode ? "Light" : "Dark"}
          </button>
          <button
            onClick={clearChat}
            className="text-xs px-2 py-1 border rounded"
          >
            Clear
          </button>
          <ConnectionStatus connected={connected} />
        </div>
      </div>

      <div className="flex-1 p-4 space-y-3 overflow-y-auto">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"
              }`}
          >
            <div
              className={`px-4 py-2 rounded-lg text-sm max-w-[75%] break-words ${msg.role === "user"
                ? "bg-black text-white rounded-br-none"
                : darkMode
                  ? "bg-gray-800 text-white rounded-bl-none"
                  : "bg-gray-100 text-black rounded-bl-none"
                }`}
            >
              <ReactMarkdown>{msg.content}</ReactMarkdown>
              <div className="flex justify-between items-center mt-1">
                <span className="text-[10px] opacity-60">
                  {msg.timestamp}
                </span>
                <button
                  onClick={() => copyText(msg.content)}
                  className="text-[10px] opacity-60 hover:opacity-100"
                >
                  Copy
                </button>
              </div>
            </div>
          </div>
        ))}

        {isTyping && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      <div className="p-3 border-t flex gap-2">
        <input
          type="text"
          placeholder="Type a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          disabled={isTyping}
          className="flex-1 border rounded px-3 py-2 text-sm focus:outline-none"
        />
        <button
          onClick={sendMessage}
          disabled={isTyping || !input.trim()}
          className={`px-4 rounded text-sm font-medium ${isTyping || !input.trim()
            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
            : "bg-black text-white hover:bg-gray-800"
            }`}
        >
          Send
        </button>
      </div>
    </div>
  );
}
