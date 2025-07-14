import { createContext, useContext, useEffect, useState } from "react";

const backendUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";

const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const [allMessages, setAllMessages] = useState([]); // Nur {role, text}
  const [currentAnswer, setCurrentAnswer] = useState([]); // Mit Animation, Audio usw.
  const [loading, setLoading] = useState(false);
  const [cameraZoomed, setCameraZoomed] = useState(true);

  const chat = async (userText) => {
    setLoading(true);
    // Neues User-Message an allMessages anhängen
    const updatedAllMessages = [...allMessages, { role: "user", text: userText }];
    setAllMessages(updatedAllMessages);

    // Nur Text-Nachrichten an Backend schicken
    const data = await fetch(`${backendUrl}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messages: updatedAllMessages }),
    });
    const resp = (await data.json()).messages;

    // currentAnswer mit OpenAI-Antworten (inkl. Animation usw.) setzen
    setCurrentAnswer(resp.map((msg) => ({ ...msg, role: "assistant" })));

    // allMessages um die neuen Assistant-Texte erweitern
    setAllMessages((prev) => [
      ...updatedAllMessages,
      ...resp.map((msg) => ({ role: "assistant", text: msg.text })),
    ]);
    setLoading(false);
  };

  // Nach dem Abspielen der aktuellen Antwort
  const onMessagePlayed = () => {
    setCurrentAnswer((msgs) => msgs.slice(1));
  };

  // Das nächste Assistant-Message für die Ausgabe
  const [message, setMessage] = useState();
  useEffect(() => {
    if (currentAnswer.length > 0) {
      setMessage(currentAnswer[0]);
    } else {
      setMessage(null);
    }
  }, [currentAnswer]);

  return (
    <ChatContext.Provider
      value={{
        chat,
        message,
        onMessagePlayed,
        loading,
        cameraZoomed,
        setCameraZoomed,
        allMessages, // für Debugging
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
};
