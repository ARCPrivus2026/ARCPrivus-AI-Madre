/**
 * Read-only fingerprint of the controls that determine R5 frame comparability.
 * Three.js classes are injected as plain objects; no imports, rendering,
 * mutation, scene save, texture upload or network. Deterministic field order.
 */
function num(v){return Number.isFinite(v)?v:null;}
function vector(v){
  if(!v)return null;
  if(Array.isArray(v.elements)) return v.elements.map(num);
  if(ArrayBuffer.isView(v.elements)) return Array.from(v.elements,num);
  if(typeof v.toArray==="function") return v.toArray().map(num);
  if("x" in v && "y" in v) return [num(v.x),num(v.y),num(v.z)];
  return null;
}
function color(c){
  if(!c)return null;
  return [num(c.r),num(c.g),num(c.b)];
}
function traverse(root,fn){
  if(typeof root?.traverse!=="function")throw new TypeError("traverse requerido");
  root.traverse(fn);
}
function state(node){
  return {
    name:String(node.name||""),type:String(node.type||""),
    matrixWorld:vector(node.matrixWorld),
    position:vector(node.position),quaternion:vector(node.quaternion),
    scale:vector(node.scale),
    visible:node.visible===undefined?null:!!node.visible
  };
}
export function fingerprintThreeScene({renderer,scene,camera,actorRoot}={}){
  if(!renderer?.domElement||!camera||!scene||!actorRoot)
    throw new TypeError("renderer, scene, camera y actorRoot requeridos");
  const viewport={
    width:renderer.domElement.width,
    height:renderer.domElement.height,
    toneMapping:renderer.toneMapping??null,
    exposure:num(renderer.toneMappingExposure),
    outputColorSpace:renderer.outputColorSpace??null,
    physicallyCorrectLights:renderer.physicallyCorrectLights??null,
    shadowEnabled:renderer.shadowMap?.enabled??null,
    shadowType:renderer.shadowMap?.type??null
  };
  if(!Number.isInteger(viewport.width)||viewport.width<=0
      ||!Number.isInteger(viewport.height)||viewport.height<=0)
    throw new TypeError("Dimensiones de canvas invalidas");
  const lights=[];
  traverse(scene,node=>{
    if(node.isLight)lights.push({
      ...state(node),intensity:num(node.intensity),color:color(node.color),
      distance:num(node.distance),decay:num(node.decay),
      angle:num(node.angle),penumbra:num(node.penumbra),
      shadowBias:num(node.shadow?.bias),
      shadowNormalBias:num(node.shadow?.normalBias)
    });
  });
  const pose=[];
  traverse(actorRoot,node=>{
    if(node.isBone || node.isSkinnedMesh || (Array.isArray(node.morphTargetInfluences))){
      pose.push({
        ...state(node),
        morph:Array.isArray(node.morphTargetInfluences)
          ?node.morphTargetInfluences.map(num):null,
        skeleton:node.isSkinnedMesh&&Array.isArray(node.skeleton?.bones)
          ?node.skeleton.bones.map(b=>String(b.name||"")):null
      });
    }
  });
  return {
    viewport,
    camera:{
      ...state(camera),
      projection:vector(camera.projectionMatrix),
      near:num(camera.near),far:num(camera.far),
      zoom:num(camera.zoom),fov:num(camera.fov)
    },
    lights,pose
  };
}
