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
  const [hasError, setHasError] = useState(false);
  const [leadForm, setLeadForm] = useState(null); // null | { hotel?, hotelId? }

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
    let reconnectTimer;
    let closedByUnmount = false;

    const handleMessage = (event) => {
      const { messages, error, uiAction } = JSON.parse(event.data);

      if (error) {
        console.error("Backend error:", error);
        setLoading(false);
        setHasError(true);
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

    const connect = () => {
      console.log("WebSocket connecting to", backendUrl);
      ws.current = new WebSocket(backendUrl);
      ws.current.onopen = () => console.log("WebSocket connected");
      ws.current.onmessage = handleMessage;
      ws.current.onerror = (e) => {
        console.error("WebSocket error", e);
        setLoading(false);
      };
      ws.current.onclose = () => {
        console.log("WebSocket disconnected");
        setLoading(false);
        // Auto-Reconnect (Session bleibt via sessionId serverseitig erhalten)
        if (!closedByUnmount) {
          clearTimeout(reconnectTimer);
          reconnectTimer = setTimeout(connect, 1500);
        }
      };
    };

    connect();

    return () => {
      closedByUnmount = true;
      clearTimeout(reconnectTimer);
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
      setHasError(true);
      return;
    }
    setHasError(false);
    setLoading(true);
    setAllMessages((prev) => [...prev, { role: "user", text: userText }]);
    ws.current.send(
      JSON.stringify({ message: userText, sessionId: sessionId.current })
    );
  };

  const clearError = () => setHasError(false);

  const openLeadForm = (context = {}) => setLeadForm(context);
  const closeLeadForm = () => setLeadForm(null);

  const sendLead = (formData) => {
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
      setHasError(true);
      return;
    }
    setHasError(false);
    setLoading(true);
    const lead = { ...formData, ...(leadForm || {}) };
    ws.current.send(JSON.stringify({ lead, sessionId: sessionId.current }));
    setLeadForm(null);
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
        hasError,
        clearError,
        leadForm,
        openLeadForm,
        closeLeadForm,
        sendLead,
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
