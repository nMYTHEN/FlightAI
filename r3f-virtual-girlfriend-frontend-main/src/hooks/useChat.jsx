import { createContext, useContext, useEffect, useRef, useState } from "react";

const backendUrl = import.meta.env.VITE_API_URL || "ws://localhost:25576";

const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const [allMessages, setAllMessages] = useState([]); // Nur {role, text}
  const [currentAnswer, setCurrentAnswer] = useState([]); // Mit Animation, Audio usw.
  const [loading, setLoading] = useState(false);
  const [cameraZoomed, setCameraZoomed] = useState(true);
  const [uiQueue, setUiQueue] = useState([]);
  const [currentUi, setCurrentUi] = useState(null);

  const ws = useRef(null);

  useEffect(() => {
    ws.current = new WebSocket(backendUrl);
    ws.current.onopen = () => console.log("WebSocket connected");
    ws.current.onclose = () => console.log("WebSocket disconnected");
    ws.current.onerror = (e) => console.error("WebSocket error", e);

    console.log("WebSocket connecting to", backendUrl);
    ws.current.onmessage = (event) => {
      const { messages, error } = JSON.parse(event.data);
      if (error) {
        setLoading(false);
        return;
      }
      setLoading(false);

      // Speech-Antworten in currentAnswer
      const speech = messages.filter((m) => m.text);
      setCurrentAnswer(speech.map((m) => ({ ...m, role: "assistant" })));

      // UI-Ereignisse in uiQueue
      const ui = messages.flatMap((m) => (m.uiAction ? [m.uiAction] : []));
      setUiQueue((prev) => [...prev, ...ui]);

      // Verlauf (reine Speech) speichern
      setAllMessages((prev) => [
        ...prev,
        ...speech.map((m) => ({ role: "assistant", text: m.text })),
      ]);

      // // Lipsync-Daten übermitteln (falls vorhanden)
      // const lipsyncData = messages.find((m) => m.lipsync);
      // if (lipsyncData) {
      //   setLipsync(lipsyncData.lipsync);
      // }
    };

    return () => {
      ws.current?.close();
    };
  }, []);

  const chat = (userText) => {
    setLoading(true);
    const updated = [...allMessages, { role: "user", text: userText }];
    setAllMessages(updated);

    ws.current.send(JSON.stringify({ messages: updated }));
  };

  const closeCurrentUi = () => setCurrentUi(null);

  // ---------- UI-Dispatcher ----------
  useEffect(() => {
    if (!currentUi && uiQueue.length > 0) {
      setCurrentUi(uiQueue[0]);
      setUiQueue((q) => q.slice(1));
    }
  }, [uiQueue, currentUi]);

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
        loading,
        message: currentAnswer[0] ?? null,
        onMessagePlayed,
        currentUi,
        closeCurrentUi,
        cameraZoomed,
        setCameraZoomed,
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
