/**
 * ARC Privus - conector opt-in para Google Gemini Interactions API.
 * Experimental: NO esta enlazado al servidor ni expone credenciales al navegador.
 * Node.js >= 20. Sin dependencias nuevas.
 * Documentacion oficial: https://ai.google.dev/gemini-api/docs/interactions-overview
 */
export const ARC_GOOGLE_MODELS = Object.freeze({
  reasoning: "gemini-3.8-flash",
  video: "gemini-omni-1.1-flash"
});
const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/interactions";
const MAX_PROMPT_CHARS = 5000;
const MAX_TIMEOUT_MS = 120000;

export function planArcGoogleTask({task = "reasoning", prompt, previousInteractionId} = {}) {
  if (!Object.hasOwn(ARC_GOOGLE_MODELS, task)) {
    throw new TypeError("Tarea no permitida: usa reasoning o video");
  }
  if (typeof prompt !== "string" || !prompt.trim() || prompt.length > MAX_PROMPT_CHARS) {
    throw new TypeError("La instruccion debe tener entre 1 y 5000 caracteres");
  }
  if (previousInteractionId != null &&
      (typeof previousInteractionId !== "string" ||
       !/^[a-zA-Z0-9_\-]{1,200}$/.test(previousInteractionId))) {
    throw new TypeError("previousInteractionId invalido");
  }
  const body = { model: ARC_GOOGLE_MODELS[task], input: prompt.trim() };
  if (previousInteractionId) body.previous_interaction_id = previousInteractionId;
  return Object.freeze({task, model: body.model, requestBody: body, needsPaidApproval: task === "video"});
}

/** Credenciales SOLO en el backend y habilitacion explicita antes de cada uso. */
export function createArcGoogleClient({
  env = process.env,
  fetchImpl = globalThis.fetch,
  timeoutMs = 45000
} = {}) {
  if (typeof fetchImpl !== "function") throw new TypeError("fetch no disponible");
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > MAX_TIMEOUT_MS) {
    throw new TypeError("timeoutMs fuera de rango");
  }

  return {
    plan: planArcGoogleTask,
    async execute({task = "reasoning", prompt, previousInteractionId, approvedSpend = false} = {}) {
      const plan = planArcGoogleTask({task, prompt, previousInteractionId});
      if (env.ARC_GOOGLE_AI_ENABLED !== "true") {
        throw new Error("Integracion Google desactivada: ARC_GOOGLE_AI_ENABLED no es true");
      }
      if (plan.needsPaidApproval &&
          (env.ARC_GOOGLE_VIDEO_ENABLED !== "true" || approvedSpend !== true)) {
        throw new Error("Video bloqueado: necesita habilitacion y aprobacion expresa del costo");
      }
      const key = env.GEMINI_API_KEY || env.GOOGLE_GEMINI_API_KEY;
      if (!key || typeof key !== "string") throw new Error("Falta GEMINI_API_KEY en servidor");

      let response;
      try {
        response = await fetchImpl(ENDPOINT, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": key
          },
          body: JSON.stringify(plan.requestBody),
          signal: AbortSignal.timeout(timeoutMs)
        });
      } catch (err) {
        throw new Error("No se pudo conectar con Google Gemini", {cause: err});
      }
      if (!response.ok) {
        // No registrar instrucciones privadas ni credenciales ni el cuerpo remoto.
        throw new Error(`Google Gemini rechazo la solicitud (HTTP ${response.status})`);
      }
      const payload = await response.json();
      return {
        provider: "google",
        task,
        model: plan.model,
        interactionId: typeof payload.id === "string" ? payload.id : null,
        payload
      };
    }
  };
}
