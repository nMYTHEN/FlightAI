/**
 * Zentrale Marken-Konfiguration.
 *
 * Alles Marken-Bezogene (Name, Assistentin, Texte) an EINER Stelle — damit ein
 * späterer Rename (z. B. weg von "NuriReisen") ein Ein-Datei-Change ist.
 *
 * Die Farben liegen in `tailwind.config.js` unter `theme.extend.colors.brand`
 * bzw. `accent` — dort ändern, dann wirken sie über alle `*-brand-*`-Klassen.
 */
export const BRAND = {
  /** Firmen-/Produktname. Änderbar ohne Nebenwirkungen. */
  company: "NuriReisen",
  /** Name der 3D-Avatar-Assistentin. */
  assistant: "Lara",
  /** Kurzer Claim, z. B. für Titel/Meta. */
  tagline: "Deine persönliche Reiseberatung",
};

/** Bequemer Voll-Titel, z. B. für <title> oder Header. */
export const BRAND_TITLE = `${BRAND.company} — Reiseberatung mit ${BRAND.assistant}`;

/**
 * 3D-Avatar-Modell (Ready Player Me GLB).
 *
 * NEUES OUTFIT einspielen (kein Code-Umbau nötig):
 *  1. Auf readyplayer.me eine Avatarin mit gewünschtem Outfit erstellen/exportieren (.glb).
 *  2. Die .glb nach `public/models/` legen.
 *  3. Hier `model` auf den neuen Dateinamen setzen.
 * Das RPM-Skelett (Wolf3D_*) bleibt gleich → die vorhandenen Animationen passen weiter.
 */
export const AVATAR = {
  model: "/models/685b2b784a14214597d88ae8.glb",
  animations: "/models/animations.glb",
};
