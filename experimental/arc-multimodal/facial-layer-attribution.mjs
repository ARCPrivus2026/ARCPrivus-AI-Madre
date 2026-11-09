/**
 * ARC Privus: mesh-layer attribution for Natalia's facial stripe.
 *
 * Read-only raycast inventory plus reversible one-mesh-at-a-time visibility
 * probes. No material, geometry, texture, GLB, blend, server, or DB writes.
 * Raycaster is approximate: alpha tests, GPU deformation, transparency,
 * render order and clipping may differ from a rendered pixel.
 */

function meshes(root){
  if(typeof root?.traverse!=="function") throw new TypeError("root.traverse requerido");
  const found=[];
  root.traverse(node=>{
    if(node&&(node.isMesh||node.isSkinnedMesh)) found.push(node);
  });
  return found;
}
function materialInfo(m){
  return {
    name:m?.name||null,
    type:m?.type||null,
    transparent:!!m?.transparent,
    opacity:Number.isFinite(m?.opacity)?m.opacity:null,
    alphaTest:Number.isFinite(m?.alphaTest)?m.alphaTest:null,
    hasAlphaMap:!!m?.alphaMap,
    depthTest:m?.depthTest??null,
    depthWrite:m?.depthWrite??null,
    side:m?.side??null,
    polygonOffset:!!m?.polygonOffset,
    colorMap:!!m?.map
  };
}
function meshInfo(node){
  const materials=Array.isArray(node.material)?node.material:[node.material];
  return {
    name:node.name||"(sin nombre)",
    uuid:node.uuid||null,
    type:node.type||null,
    visible:node.visible!==false,
    renderOrder:Number.isFinite(node.renderOrder)?node.renderOrder:0,
    materials:materials.map(materialInfo)
  };
}
function inBounds(roi,w,h){
  return roi&&["x","y","width","height"].every(key=>Number.isInteger(roi[key]))
    &&roi.x>=0&&roi.y>=0&&roi.width>0&&roi.height>0
    &&roi.x+roi.width<=w&&roi.y+roi.height<=h;
}
function isVisible(node){
  for(let part=node;part;part=part.parent) if(part.visible===false) return false;
  return true;
}
function sample(roi,w,h,grid){
  const pixels=[];
  for(let row=0;row<grid;row++) for(let col=0;col<grid;col++){
    const x=roi.x+(col+0.5)*roi.width/grid;
    const y=roi.y+(row+0.5)*roi.height/grid;
    pixels.push({x,y,ndc:{x:2*x/w-1,y:1-2*y/h}});
  }
  return pixels;
}
function summarize(samples){
  const top={},second={},pairs={};
  for(const item of samples){
    if(item.hits[0]) top[item.hits[0].name]=(top[item.hits[0].name]||0)+1;
    if(item.hits[1]) second[item.hits[1].name]=(second[item.hits[1].name]||0)+1;
    if(item.nearCoincident&&item.hits.length>1){
      const pair=item.hits.slice(0,2).map(x=>x.name).join(" / ");
      pairs[pair]=(pairs[pair]||0)+1;
    }
  }
  return {sampleCount:samples.length,topHits:top,secondHits:second,nearPairs:pairs};
}
export function auditFaceLayers({
  THREE,root,camera,width,height,stripe,control,
  grid=5,nearTolerance=0.002,maxHits=6
}={}){
  if(typeof THREE?.Raycaster!=="function"||!camera)
    throw new TypeError("THREE.Raycaster y camera requeridos");
  if(!Number.isInteger(width)||width<1||!Number.isInteger(height)||height<1)
    throw new TypeError("Dimensiones de fotograma invalidas");
  if(!inBounds(stripe,width,height)||!inBounds(control,width,height))
    throw new RangeError("ROI fuera del canvas");
  if(!Number.isInteger(grid)||grid<1||grid>9)
    throw new RangeError("grid debe ser 1..9");
  if(!Number.isFinite(nearTolerance)||nearTolerance<0||nearTolerance>1)
    throw new RangeError("nearTolerance invalido");
  if(!Number.isInteger(maxHits)||maxHits<2||maxHits>20)
    throw new RangeError("maxHits invalido");

  const nodes=meshes(root),visible=nodes.filter(isVisible);
  if(!visible.length) throw new Error("No hay mallas visibles que auditar");
  const raycaster=new THREE.Raycaster();
  if(typeof raycaster.setFromCamera!=="function"||
    typeof raycaster.intersectObjects!=="function")
    throw new TypeError("Raycaster incompatible");
  const scan=roi=>sample(roi,width,height,grid).map(p=>{
    raycaster.setFromCamera(p.ndc,camera);
    const raw=raycaster.intersectObjects(visible,false)||[];
    const byObject=new Set(),hits=[];
    for(const hit of [...raw].sort((a,b)=>a.distance-b.distance)){
      if(!hit?.object||!isVisible(hit.object)
        ||!Number.isFinite(hit.distance)||hit.distance<0) continue;
      // Raycasting may return two coincident triangles from ONE mesh:
      // never confuse those with two physically separate surface layers.
      if(byObject.has(hit.object)) continue;
      byObject.add(hit.object);
      hits.push({
        name:hit.object.name||"(sin nombre)",
        uuid:hit.object.uuid||null,
        distance:hit.distance,
        renderOrder:hit.object.renderOrder??0,
        materials:(Array.isArray(hit.object.material)
          ?hit.object.material:[hit.object.material]).map(materialInfo)
      });
      if(hits.length===maxHits) break;
    }
    const gap=hits.length>=2?hits[1].distance-hits[0].distance:null;
    return {
      x:p.x,y:p.y,hits,
      gapToSecond:gap,
      nearCoincident:gap!==null&&gap<=nearTolerance
    };
  });
  const stripeRays=scan(stripe),controlRays=scan(control);
  return {
    experiment:"arc.face.layer.attribution.v1",
    evidenceType:"raycast-candidate-only",
    sourceModified:false,
    renderVerified:false,
    overlapProven:false,
    pixelAccuracyProven:false,
    inventory:nodes.map(meshInfo),
    stripe:{...summarize(stripeRays),rays:stripeRays},
    control:{...summarize(controlRays),rays:controlRays},
    warnings:[
      "Los rayos son candidatos geométricos, no identifican por sí solos el pixel que dibujó WebGL",
      "AlphaTest, textura transparente, morphs GPU, renderOrder y depthWrite requieren revisión visual",
      "No usar raycasting para afirmar que se ha reparado la franja"
    ]
  };
}

/**
 * Requires explicit unique mesh NAMES. The local browser must provide the real
 * capture function and halt its animation loop. A whole-face mesh can make the
 * entire face disappear; this is NOT a successful 'stripe correction'.
 */
export async function runFaceVisibilityProbes({root,names,capture}={}){
  if(typeof capture!=="function") throw new TypeError("capture requerido");
  if(!Array.isArray(names)||names.length<1||names.length>20
    ||names.some(x=>typeof x!=="string"||!x.trim())
    ||new Set(names).size!==names.length)
    throw new TypeError("names requiere nombres unicos no vacios");
  const all=meshes(root),selected=names.map(name=>{
    const match=all.filter(x=>x.name===name);
    if(match.length!==1) throw new Error(
      "Nombre ambiguo o ausente: "+name+" ("+match.length+" objetos)"
    );
    return match[0];
  });
  const originals=selected.map(node=>({node,visible:node.visible}));
  try{
    const results=[{
      hidden:null,result:await capture({hidden:null,diagnostic:true})
    }];
    for(const node of selected){
      try{
        node.visible=false;
        results.push({
          hidden:node.name,
          result:await capture({hidden:node.name,diagnostic:true})
        });
      }finally{
        const original=originals.find(x=>x.node===node);
        node.visible=original.visible;
      }
    }
    return {
      experiment:"arc.face.visibility.probes.v1",
      results,sourceModified:false,
      stripeFixed:false,
      certified:false,
      note:"La desaparición de toda la cara NO cuenta como mejora"
    };
  }finally{
    for(const {node,visible} of originals) node.visible=visible;
  }
}
