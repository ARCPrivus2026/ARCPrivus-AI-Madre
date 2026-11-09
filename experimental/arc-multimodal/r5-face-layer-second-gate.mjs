/**
 * ARC R5 — inspect the SECOND gate, independently from loadActor.ready.
 * Pure read-only, no globals set and no GLB writes. Use on the real frame
 * where Natalia is rendered. Does not claim the face-layer context exists.
 */
const keys=value=>value&&typeof value==="object"
  ?Object.keys(value).slice(0,30):[];
function safe(fn){
  try{return {value:fn(),error:null};}
  catch(e){return {value:undefined,error:String(e?.message||e).slice(0,250)};}
}
function present(value){return value!==null&&value!==undefined;}
export function inspectR5FaceLayerContext({browserWindow,inspectNatalia}={}){
  if(!browserWindow||typeof browserWindow!=="object")
    throw new TypeError("browserWindow is required");
  const raw=safe(()=>browserWindow.__R5_FACE_LAYER_CONTEXT);
  const state=safe(()=>raw.value?.state);
  const actors=safe(()=>state.value?.actors);
  const nat=safe(()=>actors.value?.natalia);
  const gltf=safe(()=>nat.value?.gltf);
  const scene=safe(()=>gltf.value?.scene);
  const actor=safe(()=>typeof inspectNatalia==="function" ?inspectNatalia("natalia"):null);
  const independentReady=actor.error===null
    && actor.value?.ready===true;
  const contextReady=!!scene.value && typeof scene.value.traverse==="function";
  const rootKeys=keys(browserWindow).filter(k=>/R5|ARNOLD/i.test(k)).slice(0,20);
  let code;
  if(raw.error||state.error||actors.error||nat.error||gltf.error||scene.error||actor.error)
    code="READ_EXCEPTION";
  else if(!present(raw.value)) code="GLOBAL_CONTEXT_MISSING";
  else if(!present(state.value))code="STATE_MISSING";
  else if(!present(actors.value))code="ACTORS_MISSING";
  else if(!present(nat.value))code="NATALIA_CONTEXT_MISSING";
  else if(!present(gltf.value))code="GLTF_REF_MISSING";
  else if(!contextReady)code="GLTF_SCENE_MISSING_OR_INVALID";
  else if(!independentReady)code="INDEPENDENT_INSPECT_NOT_READY";
  else code="BOTH_GATES_CONFIRMED";
  return {
    audit:"arc.r5.face-layer-second-gate.v1",
    status:code,
    independent:{readyObserved:independentReady,
      inspectProvided:typeof inspectNatalia==="function",
      inspectError:actor.error},
    gate:{
      globalPresent:present(raw.value),statePresent:present(state.value),
      actorsPresent:present(actors.value),nataliaPresent:present(nat.value),
      gltfPresent:present(gltf.value),scenePresent:present(scene.value),
      sceneTraversable:contextReady,
      rootMatchingKeys:rootKeys,
      contextKeys:keys(raw.value),stateKeys:keys(state.value),
      actorKeys:keys(nat.value),
      errors:[raw.error,state.error,actors.error,nat.error,gltf.error,scene.error]
        .filter(Boolean)
    },
    readyOverridePerformed:false,
    sourceModified:false,
    canStartTexelPixel:code==="BOTH_GATES_CONFIRMED",
    warnings:[
      "A successful independent inspect does not create window.__R5_FACE_LAYER_CONTEXT",
      "Global may be registered in another iframe or only after another initializer",
      "Read-only object shape evidence; do not copy live GLTF objects into JSON"
    ]
  };
}

/**
 * Short bounded series, no default sleep and no long polling. Caller injects
 * a real readWindow() returning the currently displayed browser window and
 * sleepMs(ms). Never launch repeated Chromium sessions to satisfy a gate.
 */
export async function traceR5FaceLayerGate({
  readWindow,inspectNatalia,sleepMs,checks=3,intervalMs=1000
}={}){
  if(typeof readWindow!=="function"||typeof sleepMs!=="function")
    throw new TypeError("readWindow and sleepMs required");
  if(!Number.isInteger(checks)||checks<1||checks>5||
    !Number.isInteger(intervalMs)||intervalMs<0||intervalMs>3000)
    throw new RangeError("Only 1..5 checks with 0..3000ms gaps allowed");
  const events=[];
  for(let i=0;i<checks;i++){
    const snap=inspectR5FaceLayerContext({
      browserWindow:readWindow(),inspectNatalia
    });
    events.push({step:i,...snap});
    if(snap.status==="BOTH_GATES_CONFIRMED")break;
    if(i+1<checks)await sleepMs(intervalMs);
  }
  return {
    audit:"arc.r5.face-layer-second-gate.trace.v1",
    status:events.at(-1)?.status,
    events,checksPerformed:events.length,
    maxRequestedWaitMs:(checks-1)*intervalMs,
    gateBypassed:false,sourceModified:false,
    note:"Stop after bounded checks; if unresolved identify initializer/call site"
  };
}
