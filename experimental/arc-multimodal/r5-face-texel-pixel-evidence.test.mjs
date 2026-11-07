import test from "node:test";
import assert from "node:assert/strict";
import {
  evaluateFaceTexelPixelEvidence,compareFaceMorphAnchors
} from "./r5-face-texel-pixel-evidence.mjs";

const frame={
  width:400,height:200,cameraSignature:"camera-state-1",
  sceneSignature:"rig-frozen-1",textureUuid:"ColorMap-Image_0",
  textureColorSpace:"srgb",rendererColorSpace:"srgb",
  samplingMethod:"verified local texture texel readback",
  readbackOrigin:"top-left"
};
function samples({albedoStripe=120,albedoControl=120,
  renderedStripe=35,renderedControl=150}={}){
  return ["stripe","control"].flatMap((region,j)=>Array.from(
    {length:5},(_,i)=>({
      region,rayId:region+"-"+i,faceIndex:i+10+j*20,
      pixel:[j*100+i,30+i],uv:[.25+j*.5,.3+i*.05],
      albedoRgb:Array(3).fill(j?albedoControl:albedoStripe),
      renderedRgb:Array(3).fill(j?renderedControl:renderedStripe),
      textureUuid:frame.textureUuid,
      actualTexelSampled:true,actualPixelReadback:true
    })
  ));
}
test("TEXEL/PIXEL: albedo de igual brillo, franja renderizada mas oscura",()=>{
  const result=evaluateFaceTexelPixelEvidence({frame,samples:samples()});
  assert.equal(result.rayCount,10);
  assert.equal(result.summary.stripe.albedo.median,120);
  assert.equal(result.summary.control.albedo.median,120);
  assert.ok(Math.abs(result.contrast.albedoStripeControlRatio-1)<1e-6);
  assert.ok(result.contrast.renderedStripeControlRatio<0.3);
  assert.ok(result.flags.includes("RENDER_PIPELINE_OR_GEOMETRY_CANDIDATE"));
  assert.equal(result.causeDemonstrated,false);
  assert.equal(result.corrected,false);
  assert.equal(result.textureUploaded,false);
});
test("TEXEL/PIXEL: contraste visible ya en el albedo requiere estudio, no correccion",()=>{
  const result=evaluateFaceTexelPixelEvidence({
    frame,samples:samples({
      albedoStripe:40,albedoControl:160,
      renderedStripe:30,renderedControl:150
    })
  });
  assert.ok(result.flags.includes("ALBEDO_BAND_CANDIDATE"));
  assert.ok(result.flags.includes("ALBEDO_AND_RENDER_CONTRAST_COEXIST"));
  assert.equal(result.causeDemonstrated,false);
});
test("TEXEL/PIXEL: no acepta muestras inventadas ni capturas sin metadata",()=>{
  const records=samples();
  records[0].actualTexelSampled=false;
  assert.throws(()=>evaluateFaceTexelPixelEvidence({frame,samples:records}),
    /actually sampled/);
  records[0].actualTexelSampled=true;
  records[0].textureUuid="another-image";
  assert.throws(()=>evaluateFaceTexelPixelEvidence({frame,samples:records}),
    /does not match/);
  assert.throws(()=>evaluateFaceTexelPixelEvidence({
    frame:{...frame,cameraSignature:""},samples:samples()
  }),/Incomplete real-frame/);
  assert.throws(()=>evaluateFaceTexelPixelEvidence({
    frame:{...frame,readbackOrigin:"bottom-left"},samples:samples()
  }),/Incomplete real-frame/);
});
test("TEXEL/PIXEL: descarta coordenadas de pixel y UV fuera de la textura",()=>{
  let records=samples();records[0].pixel=[400,0];
  assert.throws(()=>evaluateFaceTexelPixelEvidence({frame,samples:records}),
    /outside frame/);
  records=samples();records[0].uv=[-.01,.5];
  assert.throws(()=>evaluateFaceTexelPixelEvidence({frame,samples:records}),
    /UV/);
});
test("TEXEL/PIXEL: comprueba muestras independientes por region",()=>{
  let records=samples();
  records[1].rayId=records[0].rayId;
  assert.throws(()=>evaluateFaceTexelPixelEvidence({frame,samples:records}),
    /Duplicate rayId/);
  records=samples().filter(x=>x.region==="stripe");
  assert.throws(()=>evaluateFaceTexelPixelEvidence({frame,samples:records}),
    /Not enough real samples in ROI/);
});
const morphBase={
  cameraSignature:"camera-frozen",
  rendererSignature:"renderer-frozen",
  textureUuid:"same-image",
  samples:[
    {anchorId:"vertexA",region:"stripe",faceIndex:12,uv:[.25,.35],renderedRgb:[40,40,40]},
    {anchorId:"vertexB",region:"control",faceIndex:50,uv:[.7,.45],renderedRgb:[160,160,160]}
  ]
};
const morphActive={
  ...morphBase,
  samples:[
    {anchorId:"vertexA",region:"stripe",faceIndex:12,uv:[.25,.35],renderedRgb:[90,90,90]},
    {anchorId:"vertexB",region:"control",faceIndex:50,uv:[.7,.45],renderedRgb:[160,160,160]}
  ]
};
test("MORPH: compara posiciones re-proyectadas bajo mismo UV y triangulo",()=>{
  const result=compareFaceMorphAnchors({neutral:morphBase,active:morphActive});
  assert.equal(result.pairedAnchors,2);
  assert.equal(result.rows[0].deltaLuma,50);
  assert.equal(result.rows[1].deltaLuma,0);
  assert.equal(result.causeDemonstrated,false);
});
test("MORPH: no compara anclas desplazadas de triangulo o UV diferente",()=>{
  assert.throws(()=>compareFaceMorphAnchors({
    neutral:morphBase,
    active:{...morphActive,samples:[{...morphActive.samples[0],faceIndex:15},
      morphActive.samples[1]]}
  }),/Triangle correspondence/);
  assert.throws(()=>compareFaceMorphAnchors({
    neutral:morphBase,
    active:{...morphActive,samples:[{...morphActive.samples[0],uv:[.5,.5]},
      morphActive.samples[1]]}
  }),/UV anchor drift/);
});
test("MORPH: render, camara y textura deben coincidir",()=>{
  assert.throws(()=>compareFaceMorphAnchors({
    neutral:morphBase,active:{...morphActive,cameraSignature:"other"}
  }),/must remain locked/);
  assert.throws(()=>compareFaceMorphAnchors({
    neutral:morphBase,active:{...morphActive,textureUuid:"other"}
  }),/must remain locked/);
});
