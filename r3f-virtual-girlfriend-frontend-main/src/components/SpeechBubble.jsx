import React from "react";

export const SpeechBubble = ({ message }) => {
  if (!message) return null;
  return (
    <div
      className="fixed left-1/2 top-1/4 transform -translate-x-1/2 bg-gray-200 rounded-2xl px-6 py-3 shadow-lg text-lg text-gray-900"
      style={{
        minWidth: 120,
        maxWidth: 320,
        zIndex: 30,
        pointerEvents: "none",
        wordBreak: "break-word",
      }}
    >
      {message}
    </div>
  );
};
