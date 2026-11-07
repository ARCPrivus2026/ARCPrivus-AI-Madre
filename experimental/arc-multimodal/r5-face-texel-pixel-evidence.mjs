/**
 * ARC Privus — facial albedo texel vs rendered pixel evidence.
 *
 * Passive, deterministic analysis of colors already sampled by the LOCAL
 * Windows R5 browser. No network, no image upload, no file or GLB changes.
 * The caller MUST actually sample the original color texture and read back
 * the rendered pixels. This module deliberately does NOT infer texture
 * color from the screenshot or fabricate the CPU UV lookup.
 *
 * Albedo is not directly equal to rendered color: lights, normals, skin,
 * vertex colors, color-space transforms, tone mapping and blending intervene.
 * Relative regional contrasts are exploratory evidence, never proof.
 */

const REGIONS=["stripe","control"];
const mod=(value,max)=>Math.min(max,Math.max(0,value));
const brightness=(rgb)=>rgb[0]*0.2126+rgb[1]*0.7152+rgb[2]*0.0722;
const median=arr=>{
  const sorted=[...arr].sort((a,b)=>a-b);
  const half=Math.floor(sorted.length/2);
  return sorted.length%2?sorted[half]:(sorted[half-1]+sorted[half])/2;
};
function requireRgb(v,label){
  if(!Array.isArray(v)||v.length!==3
    ||v.some(x=>!Number.isFinite(x)||x<0||x>255)){
    throw new TypeError(label+" requires RGB 0..255");
  }
}
function requireUv(v,label){
  if(!Array.isArray(v)||v.length!==2
    ||v.some(x=>!Number.isFinite(x)||x<0||x>1)){
    throw new TypeError(label+" requires UV in [0,1]");
  }
}
function validateSample(sample,frame){
  if(!sample||!REGIONS.includes(sample.region)){
    throw new TypeError("region must be stripe/control");
  }
  if(!(typeof sample.rayId==="string"||Number.isInteger(sample.rayId))
    ||String(sample.rayId).length===0) throw new TypeError("rayId required");
  if(!Number.isInteger(sample.faceIndex)||sample.faceIndex<0)
    throw new TypeError("real faceIndex required");
  if(!Array.isArray(sample.pixel)||sample.pixel.length!==2
    ||sample.pixel.some(x=>!Number.isInteger(x))
    ||sample.pixel[0]<0||sample.pixel[0]>=frame.width
    ||sample.pixel[1]<0||sample.pixel[1]>=frame.height){
    throw new RangeError("sample pixel outside frame");
  }
  requireUv(sample.uv,"sample.uv");
  requireRgb(sample.albedoRgb,"sample.albedoRgb");
  requireRgb(sample.renderedRgb,"sample.renderedRgb");
  if(sample.actualTexelSampled!==true||sample.actualPixelReadback!==true)
    throw new Error("Texel and WebGL pixel must be actually sampled");
  if(typeof sample.textureUuid!=="string"
    ||sample.textureUuid!==frame.textureUuid)
    throw new Error("Albedo texture does not match locked frame");
}
function frameMetadata(frame){
  if(!frame||!Number.isInteger(frame.width)||frame.width<1
    ||!Number.isInteger(frame.height)||frame.height<1
    ||!String(frame.cameraSignature||"").trim()
    ||!String(frame.sceneSignature||"").trim()
    ||!String(frame.textureUuid||"").trim()
    ||!String(frame.rendererColorSpace||"").trim()
    ||!String(frame.textureColorSpace||"").trim()
    ||!String(frame.samplingMethod||"").trim()
    ||frame.readbackOrigin!=="top-left"){
    throw new TypeError("Incomplete real-frame and texture sampling metadata");
  }
  if(frame.textureColorSpace!=="srgb" && frame.textureColorSpace!=="srgb-linear"
    && frame.textureColorSpace!=="linear" && frame.textureColorSpace!=="none"){
    throw new TypeError("Unrecognized texture color space");
  }
  return {
    width:frame.width,height:frame.height,
    textureUuid:frame.textureUuid,
    textureColorSpace:frame.textureColorSpace,
    rendererColorSpace:frame.rendererColorSpace,
    readbackOrigin:frame.readbackOrigin,
    samplingMethod:frame.samplingMethod,
    cameraSignature:frame.cameraSignature,
    sceneSignature:frame.sceneSignature
  };
}
function groupStats(values){
  return {
    count:values.length,
    median:median(values),
    min:Math.min(...values),
    max:Math.max(...values)
  };
}
export function evaluateFaceTexelPixelEvidence({
  frame,samples,minPerRegion=5,epsilon=0.000001
}={}){
  const locked=frameMetadata(frame);
  if(!Array.isArray(samples)||samples.length<2||samples.length>500)
    throw new RangeError("sample count must be 2..500");
  if(!Number.isInteger(minPerRegion)||minPerRegion<1||minPerRegion>250)
    throw new RangeError("minPerRegion invalid");
  if(!Number.isFinite(epsilon)||epsilon<=0)
    throw new RangeError("epsilon invalid");
  const unique=new Set();
  const result=Object.fromEntries(REGIONS.map(region=>[
    region,{albedo:[],rendered:[],observations:[]}
  ]));
  for(const sample of samples){
    validateSample(sample,locked);
    const key=sample.region+"/"+String(sample.rayId);
    if(unique.has(key))throw new Error("Duplicate rayId for ROI: "+key);
    unique.add(key);
    const albedo=brightness(sample.albedoRgb);
    const rendered=brightness(sample.renderedRgb);
    result[sample.region].albedo.push(albedo);
    result[sample.region].rendered.push(rendered);
    result[sample.region].observations.push({
      rayId:String(sample.rayId),faceIndex:sample.faceIndex,
      pixel:[...sample.pixel],uv:[...sample.uv],
      albedoLuma:albedo,renderedLuma:rendered
    });
  }
  for(const region of REGIONS){
    if(result[region].observations.length<minPerRegion)
      throw new Error("Not enough real samples in ROI: "+region);
  }
  const summary=Object.fromEntries(REGIONS.map(region=>[
    region,{
      albedo:groupStats(result[region].albedo),
      rendered:groupStats(result[region].rendered)
    }
  ]));
  const ratio=(key)=>{
    const numerator=summary.stripe[key].median;
    const denominator=summary.control[key].median;
    return denominator>epsilon?numerator/denominator:null;
  };
  const albedoRatio=ratio("albedo"),renderedRatio=ratio("rendered");
  const contrast={
    albedoStripeControlRatio:albedoRatio,
    renderedStripeControlRatio:renderedRatio,
    albedoMedianGap:summary.control.albedo.median-summary.stripe.albedo.median,
    renderedMedianGap:summary.control.rendered.median-summary.stripe.rendered.median,
    ratioDifference:albedoRatio!==null&&renderedRatio!==null
      ?renderedRatio-albedoRatio:null
  };
  const flags=[];
  if(albedoRatio===null||renderedRatio===null){
    flags.push("ZERO_REFERENCE_LUMINANCE");
  }else{
    if(albedoRatio<0.8)flags.push("ALBEDO_BAND_CANDIDATE");
    if(albedoRatio>=0.8&&renderedRatio<0.8)
      flags.push("RENDER_PIPELINE_OR_GEOMETRY_CANDIDATE");
    if(albedoRatio<0.8&&renderedRatio<0.8)
      flags.push("ALBEDO_AND_RENDER_CONTRAST_COEXIST");
    if(Math.abs(renderedRatio-albedoRatio)>0.2)
      flags.push("SHADING_AND_ALBEDO_CONTRAST_DIFFER");
  }
  return {
    audit:"arc.natalia.real-texel-rendered-pixel.v1",
    frame:locked,rayCount:samples.length,
    summary,contrast,flags,
    evidence:{samples:result},
    causeDemonstrated:false,
    corrected:false,
    sourceFilesModified:false,
    textureUploaded:false,
    conclusion:"CANDIDATES_ONLY_REQUIRE_CAUSAL_VISUAL_CHECK",
    warnings:[
      "RGB are display-code contrast proxies; do not equate raw sRGB albedo to lit WebGL output",
      "Original texture lookup must reproduce GLTF UV transforms, V orientation, mip/filters and texture source",
      "Alpha test, vertex colors, morphs, tone mapping and skin shading can affect rendered pixels",
      "No single color ratio demonstrates a stripe's root cause"
    ]
  };
}

/**
 * Compare the SAME anchored UV/triangle sample between two facial poses.
 * Pixel XY may change with morph, so do not blindly compare fixed screen XY.
 * Requires documented freeze, camera, texture and renderer parity externally.
 */
export function compareFaceMorphAnchors({
  neutral,active,uvTolerance=0.005
}={}){
  if(!neutral||!active||!Array.isArray(neutral.samples)
    ||!Array.isArray(active.samples))
    throw new TypeError("Neutral and active anchored samples required");
  if(neutral.cameraSignature!==active.cameraSignature
    ||neutral.textureUuid!==active.textureUuid
    ||neutral.rendererSignature!==active.rendererSignature
    ||!neutral.cameraSignature||!neutral.textureUuid||!neutral.rendererSignature){
    throw new Error("Camera, renderer and texture must remain locked");
  }
  if(!Number.isFinite(uvTolerance)||uvTolerance<0||uvTolerance>0.1)
    throw new RangeError("uvTolerance invalid");
  const lookup=new Map(active.samples.map(s=>[String(s.anchorId),s]));
  const rows=[];
  for(const base of neutral.samples){
    const next=lookup.get(String(base.anchorId));
    if(!next)throw new Error("Missing morph anchor "+base.anchorId);
    if(!Number.isInteger(base.faceIndex)||base.faceIndex!==next.faceIndex)
      throw new Error("Triangle correspondence changed for "+base.anchorId);
    requireUv(base.uv,"neutral.uv");requireUv(next.uv,"active.uv");
    if(Math.hypot(base.uv[0]-next.uv[0],base.uv[1]-next.uv[1])>uvTolerance)
      throw new Error("UV anchor drift for "+base.anchorId);
    requireRgb(base.renderedRgb,"neutral.rgb");
    requireRgb(next.renderedRgb,"active.rgb");
    rows.push({
      anchorId:String(base.anchorId),
      region:base.region,
      neutralLuma:brightness(base.renderedRgb),
      activeLuma:brightness(next.renderedRgb),
      deltaLuma:brightness(next.renderedRgb)-brightness(base.renderedRgb)
    });
  }
  if(neutral.samples.length!==active.samples.length
    ||new Set(rows.map(x=>x.anchorId)).size!==rows.length)
    throw new Error("Morph anchor count/identity invalid");
  return {
    audit:"arc.natalia.morph-anchored-compare.v1",
    pairedAnchors:rows.length,rows,
    causeDemonstrated:false,corrected:false,
    warning:"Morph anchor correspondence only; appearance change is not proof of root cause"
  };
}
