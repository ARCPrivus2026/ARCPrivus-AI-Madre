// ARC Privus. Contrato neutral de instrucciones para el motor 3D.
// Este modulo no renderiza ni modifica los GLB.
const ACTIONS = new Set(["idle", "walk", "run", "sit", "stand", "speak", "blink", "look"]);
const CHARACTERS = new Set(["natalia", "copiloto"]);

export function planAvatarAction({character, action, text = "", speed = 1} = {}) {
  if (!CHARACTERS.has(character)) throw new TypeError("Personaje no reconocido");
  if (!ACTIONS.has(action)) throw new TypeError("Accion no reconocida");
  if (!Number.isFinite(speed) || speed < 0.5 || speed > 2) {
    throw new TypeError("Velocidad invalida");
  }
  if (typeof text !== "string" || text.length > 1500) {
    throw new TypeError("Texto invalido");
  }
  if (action === "speak" && !text.trim()) throw new TypeError("Falta texto de voz");
  if (action !== "speak" && text) throw new TypeError("Texto solo es valido para speak");

  return Object.freeze({
    schema: "arc.avatar.action.v1",
    character, action, speed,
    text: action === "speak" ? text.trim() : "",
    motionClipRequired: ["walk", "run", "sit", "stand"].includes(action),
    facialRigRequired: ["speak", "blink", "look"].includes(action)
  });
}
