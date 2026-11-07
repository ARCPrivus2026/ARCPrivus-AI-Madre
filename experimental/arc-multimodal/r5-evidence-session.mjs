/**
 * ARC R5 - reproducible seven-mode evidence session.
 * Runs ONLY on an isolated, already-loaded GLTF scene. No I/O, no web
 * requests, no saves, no edits to GLB source. All file evidence is produced
 * and verified by injected local capture/verification functions.
 *
 * Required:
 *  holdScene(): Promise<resumeFn> - pause animation/frame loop and freeze pose
 *  frameSignature(): JSON-serializable fixed camera, lights, pose, resolution,
 *    tone mapping, output color space. Intentionally exclude material uniforms.
 *  captureFrame({mode,pass}): Promise<{width,height,data,imagePath}>
 *  verifyArtifact(imagePath): Promise<boolean> - confirm PNG saved and nonempty.
 *
 * This is evidence PREPARATION. Even clean measurements never certify a fix.
 */
import {
  R5_RENDER_MODES,runR5LightingIsolation,measureR5Rois,
  screenStripeCandidates
} from "./r5-light-normal-depth-audit.mjs";

function safeSignature(value){
  if(value===null||value===undefined) throw new TypeError("Firma de estado vacia");
  if(typeof value==="string"){
    if(!value.trim()) throw new TypeError("Firma de estado vacia");
    return value;
  }
  if(typeof value!=="object"||Array.isArray(value)) throw new TypeError("Firma de estado invalida");
  const keys=Object.keys(value);
  if(!keys.length) throw new TypeError("Firma de estado vacia");
  const signature=JSON.stringify(value);
  if(!signature||signature==="{}") throw new TypeError("Firma de estado vacia");
  return signature;
}
function checkFrame(frame,mode){
  if(!frame||!Number.isInteger(frame.width)||frame.width<=0
    ||!Number.isInteger(frame.height)||frame.height<=0
    ||!frame.data||frame.data.length!==frame.width*frame.height*4)
    throw new TypeError("Captura RGBA invalida: "+mode);
  if(typeof frame.imagePath!=="string"||!frame.imagePath.trim())
    throw new TypeError("Falta archivo PNG verificable: "+mode);
  if(!/\.png$/i.test(frame.imagePath)) throw new TypeError("Se requiere PNG: "+mode);
  return frame;
}
function diff(a,b){return Math.abs(a-b);}
function driftCheck(first,last,{lumaTolerance,ratioTolerance}){
  const delta={
    stripe:diff(first.stripeMedian,last.stripeMedian),
    control:diff(first.controlMedian,last.controlMedian),
    ratio:diff(first.stripeToControl??0,last.stripeToControl??0)
  };
  return {
    ...delta,
    stable:delta.stripe<=lumaTolerance
      &&delta.control<=lumaTolerance
      &&delta.ratio<=ratioTolerance
  };
}
export async function runR5EvidenceSession({
  THREE,root,meshNames,stripe,control,
  holdScene,frameSignature,captureFrame,verifyArtifact,
  modes=R5_RENDER_MODES,lumaTolerance=4,ratioTolerance=0.04
}={}){
  for(const [name,fn] of Object.entries({holdScene,frameSignature,captureFrame,verifyArtifact})){
    if(typeof fn!=="function") throw new TypeError(name+" requerido");
  }
  if(!Array.isArray(modes)||modes.length!==R5_RENDER_MODES.length
     ||modes.some((name,i)=>name!==R5_RENDER_MODES[i]))
     throw new Error("R5 requiere exactamente los siete modos ordenados");
  if(!Number.isFinite(lumaTolerance)||lumaTolerance<0
    ||!Number.isFinite(ratioTolerance)||ratioTolerance<0)
    throw new RangeError("Tolerancias de deriva invalidas");

  // The scene owner must halt all other render and animation activity.
  const resume=await holdScene();
  if(typeof resume!=="function") throw new TypeError("holdScene debe devolver resume()");
  let resumed=false;
  try{
    const fixed=safeSignature(await frameSignature());
    const usedPaths=new Set();
    let dimensions;
    const record=async ({mode,pass})=>{
      if(safeSignature(await frameSignature())!==fixed)
        throw new Error("Cambios de pose/camara/iluminacion antes de capturar "+mode);
      const frame=checkFrame(await captureFrame({mode,pass}),mode);
      if(dimensions && (frame.width!==dimensions.width||frame.height!==dimensions.height))
        throw new Error("Resolucion distinta entre capturas");
      dimensions={width:frame.width,height:frame.height};
      if(usedPaths.has(frame.imagePath)) throw new Error("PNG reutilizado: "+frame.imagePath);
      usedPaths.add(frame.imagePath);
      if(!await verifyArtifact(frame.imagePath))
        throw new Error("PNG no verificado o vacio: "+frame.imagePath);
      const metrics=measureR5Rois({
        width:frame.width,height:frame.height,data:frame.data,
        stripe,control,minPixels:16
      });
      if(safeSignature(await frameSignature())!==fixed)
        throw new Error("Cambios de escena durante captura "+mode);
      return {mode,pass,imagePath:frame.imagePath,width:frame.width,
        height:frame.height,...metrics};
    };
    const main=await runR5LightingIsolation({
      THREE,root,meshNames,modes,
      capture:({mode})=>record({mode,pass:"series"})
    });
    // Independent baseline at END catches lighting/pose drift and stale ROI.
    const endBaseline=await runR5LightingIsolation({
      THREE,root,meshNames,modes:["baseline"],
      capture:()=>record({mode:"baseline",pass:"control-final"})
    });
    const captures=main.outputs.map(x=>x.captureResult);
    const start=captures[0],last=endBaseline.outputs[0].captureResult;
    const drift=driftCheck(start,last,{lumaTolerance,ratioTolerance});
    const candidates=drift.stable
      ?screenStripeCandidates(captures.map(x=>({
        mode:x.mode,stripeMedian:x.stripeMedian,controlMedian:x.controlMedian
      })))
      :[];
    return {
      experiment:"arc.r5.evidence.session.v1",
      status:drift.stable?"PARTIAL_VISUAL_REVIEW_REQUIRED":"INVALID_DRIFT",
      rootCauseIsolated:false,
      anatomyCorrected:false,
      assetsModified:false,
      realAssetExecution:"reported-by-local-capture-callback-not-independently-certified",
      captureCount:captures.length+1,dimensions,
      materialRestorationReported:main.restored&&endBaseline.restored,
      drift,candidates,
      captures:[...captures,last],
      inventory:main.inventory,
      requiredNextAction:drift.stable
        ?"Inspeccion visual independiente y contraste con geometria original"
        :"Repetir sesion solo despues de estabilizar escena, camara y ROIs"
    };
  }finally{
    if(!resumed){
      resumed=true;
      await resume();
    }
  }
}
