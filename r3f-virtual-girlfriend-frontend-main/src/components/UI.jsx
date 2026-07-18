import { useRef } from "react";
import { IconGrid } from "./IconGrid";
import { useChat } from "../hooks/useChat";
import { SpeechBubble } from "./SpeechBubble";
import { HotelGrid } from "./HotelGrid";
import { HotelDetail } from "./HotelDetail";
import { ContactForm } from "./ContactForm";
import { BRAND } from "../config/brand";
import { useI18n, LOCALES } from "../i18n";

export const UI = ({ hidden, ...props }) => {
  const input = useRef();
  const { t, lang, setLang } = useI18n();
  const {
    chat,
    loading,
    cameraZoomed,
    setCameraZoomed,
    message,
    currentUi,
    closeCurrentUi,
    goBackUi,
    lastSpokenMessage,
    hasError,
    clearError,
    leadForm,
    openLeadForm,
    closeLeadForm,
    sendLead,
  } = useChat();

  const sendMessage = () => {
    const text = input.current.value;
    if (!loading && !message && text.trim() !== "") {
      chat(text);
      input.current.value = "";
      input.current.blur();
    }
  };

  const askForAdvisor = () => {
    if (!loading && !message) openLeadForm({});
  };

  if (hidden) {
    return null;
  }

  return (
    <>
      <div className="fixed top-0 left-0 right-0 bottom-0 z-10 flex justify-between p-4 flex-col pointer-events-none">
        {/* Kopfzeile: Marke links, Sprachumschalter rechts */}
        <div className="flex items-start justify-between w-full gap-2">
          <div className="backdrop-blur-md bg-white bg-opacity-60 px-4 py-3 rounded-lg shadow-sm">
            <h1 className="font-bold text-brand-800 leading-none text-lg">{BRAND.company}</h1>
            <p className="text-xs text-brand-700/80 mt-0.5">{BRAND.tagline}</p>
          </div>
          <div className="pointer-events-auto flex gap-1 bg-white/60 backdrop-blur-md rounded-lg p-1">
            {LOCALES.map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`px-2 py-1 rounded text-xs font-semibold uppercase transition ${
                  lang === l ? "bg-brand-600 text-white" : "text-brand-800 hover:bg-white"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        {currentUi?.type === "iconGrid" && (
          <IconGrid
            {...currentUi.payload}
            onSelect={(id) => {
              closeCurrentUi();
              chat(id);
            }}
          />
        )}

        {currentUi?.type === "hotelGrid" && (
          <HotelGrid
            title={currentUi.payload?.title}
            hotels={currentUi.payload?.hotels}
            onSelect={(hotelId) => {
              chat(`DETAILS ${hotelId}`);
            }}
          />
        )}

        {currentUi?.type === "hotelDetail" && (
          <HotelDetail
            hotel={currentUi.payload?.hotel}
            onBack={goBackUi}
            onBook={(hotelId) => {
              openLeadForm({
                hotelId,
                hotel: currentUi.payload?.hotel?.name,
              });
            }}
          />
        )}

        {leadForm && (
          <ContactForm
            context={leadForm}
            onSubmit={(f) => sendLead(f)}
            onCancel={closeLeadForm}
          />
        )}

        <SpeechBubble message={lastSpokenMessage || t("welcome")} />

        <div className="w-full flex flex-col items-end justify-center gap-4">
          <button
            onClick={() => setCameraZoomed(!cameraZoomed)}
            className={`pointer-events-auto p-4 rounded-md text-white transition ${
              cameraZoomed
                ? "bg-brand-700 hover:bg-brand-800"
                : "bg-brand-600 hover:bg-brand-700"
            }`}
          >
            {cameraZoomed ? (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM13.5 10.5h-6" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6" />
              </svg>
            )}
          </button>

          <button
            onClick={() => {
              document.querySelector("body").classList.toggle("greenScreen");
            }}
            className="pointer-events-auto bg-brand-600 hover:bg-brand-700 text-white p-4 rounded-md"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </button>
        </div>

        <div
          className="flex flex-col items-center gap-2 pointer-events-auto max-w-screen-sm w-full mx-auto"
          style={{ paddingBottom: "max(0px, env(safe-area-inset-bottom))" }}
        >
          {hasError && (
            <div
              onClick={clearError}
              className="cursor-pointer text-sm text-white bg-red-600/80 px-4 py-1 rounded-full backdrop-blur-sm"
            >
              {t("error.generic")}
            </div>
          )}
          {loading && (
            <div className="text-sm text-white bg-black bg-opacity-40 px-4 py-1 rounded-full backdrop-blur-sm animate-pulse">
              {t("status.thinking", { name: BRAND.assistant })}
            </div>
          )}

          <button
            onClick={askForAdvisor}
            disabled={loading || message}
            className={`self-center text-xs text-brand-800 bg-white/70 hover:bg-white backdrop-blur-md px-3 py-1.5 rounded-full font-medium transition ${
              loading || message ? "opacity-40 cursor-not-allowed" : ""
            }`}
          >
            💬 {t("btn.advisor")}
          </button>

          <div className="flex items-center gap-2 w-full">
            <input
              className="w-full text-base placeholder:text-gray-800 placeholder:italic p-4 rounded-md bg-opacity-50 bg-white backdrop-blur-md"
              placeholder={t("input.placeholder")}
              ref={input}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  sendMessage();
                }
              }}
            />
            <button
              disabled={loading || message}
              onClick={sendMessage}
              className={`bg-brand-600 hover:bg-brand-700 text-white p-4 px-6 sm:px-10 font-semibold uppercase rounded-md ${
                loading || message ? "cursor-not-allowed opacity-30" : ""
              }`}
            >
              {t("btn.send")}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
