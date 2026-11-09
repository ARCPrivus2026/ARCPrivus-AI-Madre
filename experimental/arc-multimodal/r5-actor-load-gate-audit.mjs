/**
 * ARC PRIVUS - isolated R5 Natalia load gate evidence collector.
 *
 * No I/O, no network, no globals, no GLB edits. Instrument the EXISTING
 * browser loader in a local laboratory to capture why actor.ready stays
 * false even if the server delivered a GLB. This DOES NOT override the gate.
 *
 * The host must inject current state reads and save the returned report
 * locally. Never commit private error stacks, URLs or face assets to GitHub.
 */
const bounded=(s,n=500)=>typeof s==="string"?s.slice(0,n):null;
const booleanOrNull=x=>typeof x==="boolean"?x:null;
function errorInfo(error){
  if(!error)return null;
  return {
    name:bounded(error.name||"Error",80),
    message:bounded(error.message||String(error),500),
    stack:bounded(error.stack,2000)
  };
}
function defaultState(read){
  const state=read();
  if(!state||typeof state!=="object") throw new TypeError("readState must return object");
  return {
    actorReady:booleanOrNull(state.actorReady),
    gltfPresent:booleanOrNull(state.gltfPresent),
    restPatchPresent:booleanOrNull(state.restPatchPresent),
    mouthInsertPresent:booleanOrNull(state.mouthInsertPresent),
    alertText:bounded(state.alertText,500),
    activeActor:bounded(state.activeActor,80)
  };
}
/**
 * Suggested readState (adapt to local variables, don't guess):
 *   ()=>({
 *      actorReady: actor?.ready === true,
 *      gltfPresent: Boolean(actor?.gltf?.scene),
 *      restPatchPresent: typeof v22RestPatch === "function",
 *      mouthInsertPresent: typeof v22MouthInsert === "function",
 *      alertText: document.querySelector("#alert")?.textContent,
 *      activeActor: "natalia"
 *   })
 */
export function createActorGateRecorder({readState,now=()=>Date.now(),maxEvents=60}={}){
  if(typeof readState!=="function"||typeof now!=="function")throw new TypeError("readState and now required");
  if(!Number.isInteger(maxEvents)||maxEvents<2||maxEvents>500)
    throw new RangeError("maxEvents invalid");
  const records=[];
  const emit=(phase,{error}={})=>{
    const snapshot=defaultState(readState);
    const item={
      index:records.length,
      atMs:now(),
      phase:bounded(phase,120),
      ...snapshot,
      error:errorInfo(error)
    };
    if(records.length>=maxEvents)records.shift();
    records.push(item);
    return item;
  };
  const snapshot=()=>records.map(x=>({...x,error:x.error?{...x.error}:null}));
  const result=()=>{
    const events=snapshot();
    const last=events.at(-1)||null;
    const hadError=events.some(x=>x.error||x.phase==="window.error"||x.phase==="window.unhandledrejection");
    const hasReady=events.some(x=>x.actorReady===true&&x.gltfPresent===true);
    let status="NOT_INSTRUMENTED";
    if(hasReady)status="READY_OBSERVED";
    else if(hadError)status="LOAD_OR_RUNTIME_ERROR_OBSERVED";
    else if(last?.gltfPresent===true && last?.actorReady!==true)status="GLTF_PRESENT_GATE_NOT_READY";
    else if(last?.gltfPresent===false)status="GLTF_NOT_PRESENT_AT_LAST_SNAPSHOT";
    else if(last)status="STATE_INCONCLUSIVE";
    return {
      audit:"arc.r5.natalia.load-gate.v1",
      events,classification:status,
      actorReadinessOverride:false,
      sourceModified:false,
      correctionApplied:false,
      warning:"A successful HTTP 200 does not imply GLTF parser completed or actor.ready=true"
    };
  };
  return {
    observe:emit,
    getReport:result,
    wrapLoader(loader,{label="loadActor"}={}){
      if(typeof loader!=="function")throw new TypeError("loader function required");
      return async function(...args){
        emit(label+".start");
        try{
          const value=await loader.apply(this,args);
          emit(label+".resolved");
          return value;
        }catch(error){
          // Diagnose without swallowing the original loader error.
          try{emit(label+".rejected",{error});}
          catch(telemetryError){/* Telemetry must not hide original error. */}
          throw error;
        }
      };
    },
    /**
     * Optional browser exception hooks for an isolated lab ONLY.
     * Requires manual call after model load begins; returns cleanup.
     */
    attachWindow(windowRef){
      if(typeof windowRef?.addEventListener!=="function"||
        typeof windowRef?.removeEventListener!=="function")
        throw new TypeError("window add/removeEventListener required");
      const capture=(phase,error)=>{
        try{emit(phase,{error});}
        catch(telemetryError){/* diagnostic is best effort */}
      };
      const onError=event=>capture("window.error",event.error||new Error(event.message||"window error"));
      const onRejection=event=>capture("window.unhandledrejection",
        event.reason instanceof Error?event.reason:new Error(String(event.reason)));
      windowRef.addEventListener("error",onError);
      windowRef.addEventListener("unhandledrejection",onRejection);
      return ()=>{
        windowRef.removeEventListener("error",onError);
        windowRef.removeEventListener("unhandledrejection",onRejection);
      };
    }
  };
}
