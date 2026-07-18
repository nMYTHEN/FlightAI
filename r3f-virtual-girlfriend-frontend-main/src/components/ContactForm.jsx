import { useState } from "react";
import { useI18n } from "../i18n";

const inputCls =
  "w-full p-3 rounded-lg border border-gray-300 focus:border-brand-500 focus:outline-none text-base";

export const ContactForm = ({ context, onSubmit, onCancel }) => {
  const { t } = useI18n();
  const [form, setForm] = useState({ name: "", email: "", phone: "", note: "" });

  const valid = form.email.trim() !== "" || form.phone.trim() !== "";
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4 backdrop-blur-sm bg-black/25 pointer-events-auto">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
        <h2 className="font-bold text-xl mb-1">{t("lead.title")}</h2>
        <p className="text-sm text-gray-600 mb-4">
          {context?.hotel
            ? t("lead.subtitleHotel", { hotel: context.hotel })
            : t("lead.subtitle")}
        </p>

        <div className="flex flex-col gap-2">
          <input className={inputCls} placeholder={t("lead.name")} value={form.name} onChange={set("name")} />
          <input className={inputCls} type="email" placeholder={t("lead.email")} value={form.email} onChange={set("email")} />
          <input className={inputCls} type="tel" placeholder={t("lead.phone")} value={form.phone} onChange={set("phone")} />
          <textarea className={inputCls} rows={2} placeholder={t("lead.note")} value={form.note} onChange={set("note")} />
        </div>

        {!valid && <p className="text-xs text-gray-400 mt-2">{t("lead.needContact")}</p>}
        <p className="text-xs text-gray-400 mt-1">{t("lead.privacy")}</p>

        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100"
          >
            {t("lead.cancel")}
          </button>
          <button
            disabled={!valid}
            onClick={() => onSubmit(form)}
            className={`px-4 py-2 rounded-lg text-white bg-brand-600 hover:bg-brand-700 ${
              !valid ? "opacity-40 cursor-not-allowed" : ""
            }`}
          >
            {t("lead.submit")}
          </button>
        </div>
      </div>
    </div>
  );
};
