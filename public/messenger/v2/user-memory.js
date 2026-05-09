console.log("ARC USER MEMORY ENGINE CARGADO");

/* =========================
   CARGAR PERFILES
========================= */
function loadUserProfiles() {
  try {
    const raw = localStorage.getItem("arcUserProfiles") || "{}";
    const parsed = JSON.parse(raw);

    if (typeof parsed !== "object" || parsed === null) {
      return {};
    }

    return parsed;
  } catch (error) {
    console.warn("Error cargando perfiles:", error);
    return {};
  }
}

/* =========================
   GUARDAR PERFILES
========================= */
function saveUserProfiles(data) {
  try {
    localStorage.setItem("arcUserProfiles", JSON.stringify(data));
  } catch (error) {
    console.warn("Error guardando perfiles:", error);
  }
}

/* =========================
   NORMALIZAR TEXTO
========================= */
function normalizeText(value) {
  return String(value || "").trim();
}

/* =========================
   ASEGURAR PERFIL
========================= */
function ensureUserProfile(user) {
  const profiles = loadUserProfiles();
  const cleanUser = normalizeText(user);

  if (!cleanUser) {
    return null;
  }

  if (!profiles[cleanUser]) {
    profiles[cleanUser] = {
      name: cleanUser,
      interests: [],
      notes: [],
      created: Date.now(),
      updated: Date.now()
    };

    saveUserProfiles(profiles);
  }

  return profiles[cleanUser];
}

/* =========================
   OBTENER PERFIL
========================= */
function getUserProfile(user) {
  const profiles = loadUserProfiles();
  const cleanUser = normalizeText(user);

  if (!cleanUser) {
    return null;
  }

  if (!profiles[cleanUser]) {
    profiles[cleanUser] = {
      name: cleanUser,
      interests: [],
      notes: [],
      created: Date.now(),
      updated: Date.now()
    };

    saveUserProfiles(profiles);
  }

  return profiles[cleanUser];
}

/* =========================
   AGREGAR INTERÉS
========================= */
function addInterest(user, interest) {
  const profiles = loadUserProfiles();
  const cleanUser = normalizeText(user);
  const cleanInterest = normalizeText(interest);

  if (!cleanUser || !cleanInterest) {
    return false;
  }

  if (!profiles[cleanUser]) {
    profiles[cleanUser] = {
      name: cleanUser,
      interests: [],
      notes: [],
      created: Date.now(),
      updated: Date.now()
    };
  }

  const exists = profiles[cleanUser].interests.some(
    item => item.toLowerCase() === cleanInterest.toLowerCase()
  );

  if (!exists) {
    profiles[cleanUser].interests.push(cleanInterest);
  }

  profiles[cleanUser].updated = Date.now();
  saveUserProfiles(profiles);

  return true;
}

/* =========================
   AGREGAR NOTA
========================= */
function addNote(user, note) {
  const profiles = loadUserProfiles();
  const cleanUser = normalizeText(user);
  const cleanNote = normalizeText(note);

  if (!cleanUser || !cleanNote) {
    return false;
  }

  if (!profiles[cleanUser]) {
    profiles[cleanUser] = {
      name: cleanUser,
      interests: [],
      notes: [],
      created: Date.now(),
      updated: Date.now()
    };
  }

  profiles[cleanUser].notes.push(cleanNote);
  profiles[cleanUser].updated = Date.now();

  saveUserProfiles(profiles);

  return true;
}

/* =========================
   VER TODOS LOS PERFILES
========================= */
function getAllProfiles() {
  return loadUserProfiles();
}

/* =========================
   EXPORTAR MOTOR
========================= */
window.ARC_USER_MEMORY = {
  loadUserProfiles,
  saveUserProfiles,
  getUserProfile,
  ensureUserProfile,
  addInterest,
  addNote,
  getAllProfiles
};