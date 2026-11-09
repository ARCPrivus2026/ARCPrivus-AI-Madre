/**
 * ARC Privus R5 - trusted preflight for live texel/pixel sampling.
 *
 * The R5 gate trace contains canStartTexelPixel INSIDE events[i].
 * A loaded Three.js Texture.uuid is generated per runtime object and
 * MUST NOT be compared across browser sessions.
 *
 * This helper checks the binding of CURRENT frame to CURRENT texture UUID
 * and recommends stable *content* digests for cross-session provenance.
 * It neither hashes GLB bytes nor turns user-supplied hash strings into proof.
 * Hashes must be independently computed from real source bytes in Windows.
 */
const hex64=v=>typeof v==="string"&&/^[a-f0-9]{64}$/i.test(v);
const safeString=v=>typeof v==="string"&&v.trim().length>0;
function gateOK(gate){
  if(!gate||typeof gate!=="object")return false;
  const events=Array.isArray(gate.events)?gate.events:[];
  if(events.length){
    // Actual traceR5FaceLayerGate saves readiness in EACH event.
    const latest=events.at(-1);
    return latest?.status==="BOTH_GATES_CONFIRMED"
      &&latest?.canStartTexelPixel===true
      &&latest?.independent?.readyObserved===true
      &&latest?.gate?.sceneTraversable===true;
  }
  // Only a direct inspectR5FaceLayerContext snapshot can use this shape.
  return gate.status==="BOTH_GATES_CONFIRMED"
    &&gate.canStartTexelPixel===true
    &&gate.independent?.readyObserved===true
    &&gate.gate?.sceneTraversable===true;
}
function stableIdentity(value,scope){
  if(!value||typeof value!=="object")throw new TypeError(scope+" provenance missing");
  if(!hex64(value.glbSha256))throw new TypeError(scope+" SHA-256 of GLB missing");
  if(!Number.isInteger(value.gltfMaterialIndex)||value.gltfMaterialIndex<0)
    throw new TypeError(scope+" glTF material index missing");
  if(!Number.isInteger(value.gltfTextureIndex)||value.gltfTextureIndex<0)
    throw new TypeError(scope+" glTF albedo texture index missing");
  if(!safeString(value.textureSourceKind)||
    !["embedded-glb","external-file"].includes(value.textureSourceKind))
    throw new TypeError(scope+" texture source kind invalid");
  if(value.textureSourceKind==="external-file"&&!hex64(value.textureSha256))
    throw new TypeError(scope+" external texture SHA-256 missing");
  if(value.textureSourceKind==="embedded-glb"&&value.textureSha256
    &&!hex64(value.textureSha256))
    throw new TypeError(scope+" optional texture SHA-256 invalid");
  if(value.shaVerifiedFromBytes!==true)
    throw new Error(scope+" content digest not verified from source bytes");
  return {
    glbSha256:value.glbSha256.toLowerCase(),
    gltfMaterialIndex:value.gltfMaterialIndex,
    gltfTextureIndex:value.gltfTextureIndex,
    textureSourceKind:value.textureSourceKind,
    textureSha256:value.textureSha256?.toLowerCase()||null
  };
}
function sameContent(a,b){
  return a.glbSha256===b.glbSha256
    &&a.gltfMaterialIndex===b.gltfMaterialIndex
    &&a.gltfTextureIndex===b.gltfTextureIndex
    &&a.textureSourceKind===b.textureSourceKind
    &&(a.textureSourceKind==="embedded-glb"
      ||a.textureSha256===b.textureSha256);
}
export function evaluateR5SamplingPreflight({
  gate,loaded,frame,prior=null
}={}){
  const conditions=[];
  const gateReady=gateOK(gate);
  conditions.push({name:"liveSecondGate",pass:gateReady});
  const now=stableIdentity(loaded,"loaded");
  const previous=prior?stableIdentity(prior,"prior"):null;
  const frameUuid=safeString(frame?.textureUuid)?frame.textureUuid:null;
  const loadedUuid=safeString(loaded?.runtimeTextureUuid)
    ?loaded.runtimeTextureUuid:null;
  const frameMatchesRuntime=!!frameUuid&&frameUuid===loadedUuid;
  conditions.push({name:"sameFrameRuntimeTexture",pass:frameMatchesRuntime});
  const stableProvenance=previous===null?"not-recorded":
    sameContent(now,previous)?"matching-source-bytes":"different-source-bytes";
  // Never fail solely because UUID differs across sessions.
  const priorUuid=prior?.runtimeTextureUuid??null;
  const differentUuidAcrossSessions=!!priorUuid&&priorUuid!==loadedUuid;
  const canSample=gateReady&&frameMatchesRuntime
    &&stableProvenance!=="different-source-bytes";
  return {
    audit:"arc.r5.texel-pixel.safe-preflight.v1",
    canSample,
    conditions,
    stableProvenance,
    differentUuidAcrossSessions,
    uuidDifferenceBlocks:false,
    provenance:now,
    status:canSample?"READY_FOR_REAL_SAMPLING":"BLOCKED",
    sourceModified:false,
    modelCorrected:false,
    notes:[
      "The CURRENT runtime texture UUID must match the CURRENT capture frame",
      "UUIDs from distinct GLTFLoader sessions are not stable content identifiers",
      "Compute SHA-256 from actual GLB/external image bytes; a declared string alone is not evidence",
      "For embedded textures, identical GLB bytes and glTF texture/material indices bind the same source",
      "Recheck source identity after any file update; if prior provenance is absent, save it in this session"
    ]
  };
}
