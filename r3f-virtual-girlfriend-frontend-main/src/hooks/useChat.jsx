import { createContext, useContext, useEffect, useRef, useState } from "react";

const backendUrl = import.meta.env.VITE_API_URL || "ws://localhost:25576";

const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const [allMessages, setAllMessages] = useState([]);
  const [currentAnswer, setCurrentAnswer] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cameraZoomed, setCameraZoomed] = useState(true);
  const [currentUi, setCurrentUiState] = useState(null);
  const [previousUi, setPreviousUi] = useState(null);
  const [lastSpokenMessage, setLastSpokenMessage] = useState(null);

  // Refs so the WebSocket handler (created once) can read current state
  const currentUiRef = useRef(null);
  const ws = useRef(null);

  // Persistente Session-ID, damit der Verlauf einen Reload/Reconnect überlebt.
  const sessionId = useRef(
    (() => {
      let id = localStorage.getItem("nurireisen_session");
      if (!id) {
        id = crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;
        localStorage.setItem("nurireisen_session", id);
      }
      return id;
    })()
  );

  useEffect(() => {
    ws.current = new WebSocket(backendUrl);
    console.log("WebSocket connecting to", backendUrl);

    ws.current.onopen = () => console.log("WebSocket connected");
    ws.current.onclose = () => console.log("WebSocket disconnected");
    ws.current.onerror = (e) => {
      console.error("WebSocket error", e);
      setLoading(false);
    };

    ws.current.onmessage = (event) => {
      const { messages, error, uiAction } = JSON.parse(event.data);

      if (error) {
        console.error("Backend error:", error);
        setLoading(false);
        return;
      }

      setLoading(false);

      const speech = messages.filter((m) => m.text);
      setCurrentAnswer(speech.map((m) => ({ ...m, role: "assistant" })));
      setAllMessages((prev) => [
        ...prev,
        ...speech.map((m) => ({ role: "assistant", text: m.text })),
      ]);

      // Track UI history so "back" works from hotelDetail → hotelGrid
      const newUi = uiAction?.type ? uiAction : null;
      if (newUi) {
        setPreviousUi(currentUiRef.current);
      }
      setCurrentUiState(newUi);
      currentUiRef.current = newUi;
    };

    return () => {
      ws.current?.close();
    };
  }, []);

  // Keep lastSpokenMessage in sync with what's playing
  useEffect(() => {
    if (currentAnswer.length > 0) {
      setLastSpokenMessage(currentAnswer[0].text);
    }
  }, [currentAnswer]);

  const chat = (userText) => {
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
      console.error("WebSocket not connected");
      return;
    }
    setLoading(true);
    setAllMessages((prev) => [...prev, { role: "user", text: userText }]);
    ws.current.send(
      JSON.stringify({ message: userText, sessionId: sessionId.current })
    );
  };

  const onMessagePlayed = () => {
    setCurrentAnswer((msgs) => msgs.slice(1));
  };

  const closeCurrentUi = () => {
    setCurrentUiState(null);
    currentUiRef.current = null;
  };

  const goBackUi = () => {
    setCurrentUiState(previousUi);
    currentUiRef.current = previousUi;
    setPreviousUi(null);
  };

  return (
    <ChatContext.Provider
      value={{
        chat,
        loading,
        message: currentAnswer[0] ?? null,
        onMessagePlayed,
        currentUi,
        closeCurrentUi,
        goBackUi,
        cameraZoomed,
        setCameraZoomed,
        lastSpokenMessage,
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
