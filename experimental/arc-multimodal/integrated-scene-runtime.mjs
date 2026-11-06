/**
 * ARC Privus: director audiovisual integral, sin dependencias y sin red.
 *
 * Ordena dos actores y sus canales independientes: movimiento, rostro y voz.
 * No inventa clips GLB ni produce audio: requiere adaptadores reales inyectados.
 */
import {planAvatarAction} from "./avatar-action-contract.mjs";

export const ARC_SCENE_VERSION = "arc.integrated.scene.v1";
const MAX_CUES = 200;
const MAX_TIME_MS = 120000;
const MAX_DURATION_MS = 30000;
const CHANNEL = Object.freeze({
  idle:"motion", walk:"motion", run:"motion", sit:"motion",
  stand:"motion", speak:"voice", blink:"face", look:"face"
});
const REQUIRED_MOTIONS = ["idle","walk","run","sit","stand"];

function stringSet(items, label) {
  if (!Array.isArray(items) || items.some(x => typeof x !== "string")) {
    throw new TypeError(label+" requiere lista de nombres");
  }
  return new Set(items.map(x => x.trim().toLowerCase()).filter(Boolean));
}

function hasOne(set, choices) { return choices.some(item => set.has(item)); }

/** Contrato de metadatos: no modifica geometria, ni asegura que un rig sea bueno. */
export function auditAvatarRig(manifest = {}) {
  const issues = [];
  const bones = stringSet(manifest.bones || [], "bones");
  const morphs = stringSet(manifest.morphs || [], "morphs");
  const clips = stringSet(manifest.clips || [], "clips");
  const aliases = manifest.clipMap || {};
  if (typeof aliases !== "object" || !aliases || Array.isArray(aliases)) {
    throw new TypeError("clipMap invalido");
  }
  for (const a of REQUIRED_MOTIONS) {
    const clip = aliases[a] || a;
    if (typeof clip !== "string" || !clips.has(clip.toLowerCase())) {
      issues.push("clip ausente: "+a);
    }
  }
  const groups = [
    ["mano izquierda", ["lefthand","hand_l","left_hand","mixamoriglefthand"]],
    ["mano derecha", ["righthand","hand_r","right_hand","mixamorigrighthand"]],
    ["pie izquierdo", ["leftfoot","foot_l","left_foot","mixamorigleftfoot"]],
    ["pie derecho", ["rightfoot","foot_r","right_foot","mixamorigrightfoot"]],
    ["cabeza", ["head","mixamorighead"]],
    ["ojo izquierdo", ["lefteye","eye_l","left_eye"]],
    ["ojo derecho", ["righteye","eye_r","right_eye"]]
  ];
  for (const [label, names] of groups) if (!hasOne(bones,names)) issues.push("hueso ausente: "+label);
  const hasJaw = hasOne(morphs, ["jawopen","mouthopen","mouth_open"]);
  const hasBlink = hasOne(morphs, ["eyeblink","eyeblinkleft","blink","blinkleft"]);
  if (!hasJaw) issues.push("morph ausente: apertura de boca");
  if (!hasBlink) issues.push("morph ausente: parpadeo");
  if (!manifest.voiceEnabled) issues.push("voz aun no enlazada");
  return Object.freeze({ready:issues.length===0,issues:Object.freeze(issues),motionClips:REQUIRED_MOTIONS});
}

export function planIntegratedScene({cues, manifests} = {}) {
  if (!Array.isArray(cues) || !cues.length || cues.length>MAX_CUES) {
    throw new TypeError("La escena exige entre 1 y 200 instrucciones");
  }
  if (!manifests || typeof manifests !== "object") throw new TypeError("Faltan manifests");
  const used = new Set();
  const validated = cues.map((raw, index) => {
    if (!raw || typeof raw !== "object") throw new TypeError("Cue invalida");
    const atMs=raw.atMs;
    if (!Number.isInteger(atMs) || atMs<0 || atMs>MAX_TIME_MS) {
      throw new RangeError("Tiempo invalido en evento "+index);
    }
    const durationMs=raw.durationMs ?? 0;
    if (!Number.isInteger(durationMs) || durationMs<0 || durationMs>MAX_DURATION_MS) {
      throw new RangeError("Duracion invalida en evento "+index);
    }
    const command=planAvatarAction(raw);
    const channel=CHANNEL[command.action];
    const id=command.character;
    used.add(id);
    const manifest=manifests[id];
    if (!manifest) throw new Error("Falta manifest de "+id);
    const caps=auditAvatarRig(manifest);
    if (!caps.ready) {
      throw new Error("Rig "+id+" NO listo: "+caps.issues.join("; "));
    }
    const clip = manifest.clipMap?.[command.action] || command.action;
    return Object.freeze({atMs,durationMs,channel,clip,command,index});
  });
  // Se acepta la simultaneidad de canales diferentes para un mismo personaje.
  const occupied=new Set();
  for (const ev of validated) {
    const key=ev.atMs+":"+ev.command.character+":"+ev.channel;
    if (occupied.has(key)) throw new Error("Dos comandos simultaneos en el mismo canal: "+key);
    occupied.add(key);
  }
  const ordered=validated.sort((a,b)=>a.atMs-b.atMs||a.index-b.index);
  return Object.freeze({
    version:ARC_SCENE_VERSION,
    characters:Object.freeze([...used].sort()),
    events:Object.freeze(ordered)
  });
}

/**
 * adapter.motion(ev), adapter.face(ev), adapter.voice(ev) son funciones async.
 * No realiza llamadas por si solo; espera un adaptador conectado a clips/voz.
 * sleep inyectable permite pruebas instantaneas y reproducibles.
 */
export async function runIntegratedScene(plan, {adapter, sleep, onEvent} = {}) {
  if (plan?.version!==ARC_SCENE_VERSION || !Array.isArray(plan.events)) {
    throw new TypeError("Plan de escena incompatible");
  }
  if (!adapter || ["motion","face","voice"].some(x=>typeof adapter[x]!=="function")) {
    throw new TypeError("Se requieren tres canales: motion, face, voice");
  }
  const wait=sleep || (ms=>new Promise(resolve=>setTimeout(resolve,ms)));
  if (typeof wait!=="function") throw new TypeError("sleep invalido");
  const trace=[];
  let elapsed=0;
  let i=0;
  try {
    while(i<plan.events.length) {
      const at=plan.events[i].atMs;
      if (at>elapsed) await wait(at-elapsed);
      elapsed=at;
      const batch=[];
      while(i<plan.events.length && plan.events[i].atMs===at) batch.push(plan.events[i++]);
      // Ejecutamos en paralelo voz, rostro y movimiento del mismo instante.
      await Promise.all(batch.map(async event=>{
        try {
          await adapter[event.channel](event);
          const record={atMs:at,character:event.command.character,action:event.command.action,ok:true};
          trace.push(record);
          if (onEvent) await onEvent(record);
        } catch(err) {
          const record={atMs:at,character:event.command.character,action:event.command.action,ok:false};
          trace.push(record);
          throw new Error("Fallo de "+event.command.character+"/"+event.command.action,{cause:err});
        }
      }));
    }
    return {ok:true,events:trace};
  } catch (error) {
    return {ok:false,events:trace,error: String(error?.message||error)};
  }
}
