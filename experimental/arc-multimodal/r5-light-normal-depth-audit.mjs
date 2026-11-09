/**
 * ARC Natalia R5: temporary WebGL lighting/normal/depth decomposition.
 *
 * SECURITY: isolated local lab ONLY. Originals are never modified, exported or
 * saved. Only the material references of explicitly named facial meshes are
 * replaced for a single awaited capture and restored in finally.
 *
 * WARNING: diagnostic materials may look different even with healthy geometry.
 * No variant on its own demonstrates the root cause or certifies appearance.
 */
export const R5_RENDER_MODES=Object.freeze([
  "baseline","lambert-smooth","lambert-flat",
  "pbr-flat","normal-smooth","normal-flat","depth"
]);
function pbr(material){
  return !!(material?.isMeshStandardMaterial||material?.isMeshPhysicalMaterial);
}
function requireTargets(root,meshNames){
  if(typeof root?.traverse!=="function") throw new TypeError("root.traverse requerido");
  if(!Array.isArray(meshNames)||meshNames.length<1||meshNames.length>30||
    meshNames.some(x=>typeof x!=="string"||!x.trim())||
    new Set(meshNames).size!==meshNames.length){
    throw new TypeError("Se requieren nombres faciales unicos y explicitos");
  }
  const names=new Set(meshNames);
  const found=new Set(),nodes=[];
  root.traverse(node=>{
    if(!names.has(node?.name)||!(node.isMesh||node.isSkinnedMesh)) return;
    found.add(node.name);
    const materials=Array.isArray(node.material)?node.material:[node.material];
    if(materials.length===0||materials.some(m=>!pbr(m)||typeof m.clone!=="function")){
      throw new Error("Material facial original no es PBR clonable: "+node.name);
    }
    nodes.push({node,materials,original:node.material,arr:Array.isArray(node.material)});
  });
  const missing=[...names].filter(x=>!found.has(x));
  if(missing.length) throw new Error("Faltan mallas faciales: "+missing.join(", "));
  return nodes;
}
function makeMaterial(THREE,source,mode){
  if(mode==="pbr-flat"){
    const m=source.clone();
    if(m===source) throw new Error("clone no aislado");
    m.flatShading=true;m.needsUpdate=true;
    return m;
  }
  const common={
    side:source.side,
    transparent:source.transparent,
    opacity:source.opacity,
    alphaTest:source.alphaTest,
    depthTest:source.depthTest,
    depthWrite:source.depthWrite,
    wireframe:false
  };
  let m;
  if(mode==="lambert-smooth"||mode==="lambert-flat"){
    if(typeof THREE?.MeshLambertMaterial!=="function") throw new TypeError("MeshLambertMaterial requerido");
    m=new THREE.MeshLambertMaterial({
      ...common,color:source.color,map:source.map,alphaMap:source.alphaMap,
      vertexColors:source.vertexColors,
      flatShading:mode==="lambert-flat"
    });
  }else if(mode==="normal-smooth"||mode==="normal-flat"){
    if(typeof THREE?.MeshNormalMaterial!=="function") throw new TypeError("MeshNormalMaterial requerido");
    m=new THREE.MeshNormalMaterial({...common,flatShading:mode==="normal-flat"});
  }else if(mode==="depth"){
    if(typeof THREE?.MeshDepthMaterial!=="function") throw new TypeError("MeshDepthMaterial requerido");
    m=new THREE.MeshDepthMaterial({...common});
  }else throw new RangeError("Modo R5 desconocido: "+mode);
  if(!m||m===source) throw new Error("Material diagnostico no aislado");
  return m;
}
/**
 * await capture({mode,inventory}) must render a fixed camera/light/pose frame
 * and return saved capture metadata (e.g. PNG file + ROIs measured).
 */
export async function runR5LightingIsolation({
  THREE,root,meshNames,capture,modes=R5_RENDER_MODES
}={}){
  if(typeof capture!=="function") throw new TypeError("capture requerido");
  if(!Array.isArray(modes)||!modes.length||
    new Set(modes).size!==modes.length||
    modes.some(m=>!R5_RENDER_MODES.includes(m)))
    throw new TypeError("Modos R5 invalidos");
  const nodes=requireTargets(root,meshNames);
  const inventory=nodes.flatMap(({node,materials})=>materials.map((m,index)=>({
    mesh:node.name,index,name:m.name||null,type:m.type||null,
    map:!!m.map,normalMap:!!m.normalMap,
    metalnessMap:!!m.metalnessMap,roughnessMap:!!m.roughnessMap,
    side:m.side,flatShading:!!m.flatShading
  })));
  const outputs=[];
  for(const mode of modes){
    const replacements=[];
    try{
      if(mode!=="baseline"){
        // Construct all material sets before installing any of them.
        for(const target of nodes){
          const copies=[];
          try{
            for(const src of target.materials) copies.push(makeMaterial(THREE,src,mode));
          }catch(error){
            for(const copy of copies) copy.dispose?.();
            throw error;
          }
          replacements.push({target,copies});
        }
        for(const {target,copies} of replacements){
          target.node.material=target.arr?copies:copies[0];
        }
      }
      outputs.push({
        mode,
        captureResult:await capture({mode,inventory,diagnostic:mode!=="baseline"})
      });
    }finally{
      for(const {target} of replacements) target.node.material=target.original;
      for(const {copies} of replacements) for(const copy of copies) copy.dispose?.();
    }
  }
  return {experiment:"arc.r5.light-normal-depth.v1",
    sourceModified:false,restored:true,inventory,outputs};
}
function validRoi(roi,width,height){
  return roi && ["x","y","width","height"].every(k=>Number.isInteger(roi[k]))
    && roi.x>=0 && roi.y>=0 && roi.width>0 && roi.height>0
    && roi.x+roi.width<=width && roi.y+roi.height<=height;
}
function overlaps(a,b){
  return a.x<b.x+b.width&&b.x<a.x+a.width
    &&a.y<b.y+b.height&&b.y<a.y+a.height;
}
function median(arr){
  arr.sort((a,b)=>a-b);
  const mid=Math.floor(arr.length/2);
  return arr.length%2?arr[mid]:(arr[mid-1]+arr[mid])/2;
}
/**
 * sRGB display-luma proxy (0..255), not absolute scene-linear luminance.
 * Rejects off-canvas/overlapping rectangles and largely transparent ROIs.
 */
export function measureR5Rois({width,height,data,stripe,control,minPixels=16}={}){
  if(!Number.isInteger(width)||!Number.isInteger(height)
    ||width<1||height<1||!data||data.length!==width*height*4)
    throw new TypeError("RGBA de captura invalido");
  if(!validRoi(stripe,width,height)||!validRoi(control,width,height))
    throw new RangeError("ROI fuera del canvas");
  if(overlaps(stripe,control)) throw new RangeError("ROI de franja y piel superpuestas");
  if(!Number.isInteger(minPixels)||minPixels<1) throw new RangeError("minPixels invalido");
  const read=roi=>{
    const values=[];
    for(let y=roi.y;y<roi.y+roi.height;y++){
      for(let x=roi.x;x<roi.x+roi.width;x++){
        const idx=4*(y*width+x);
        if(data[idx+3]<250) continue;
        values.push(0.2126*data[idx]+0.7152*data[idx+1]+0.0722*data[idx+2]);
      }
    }
    if(values.length<minPixels) throw new Error("ROI sin suficientes pixeles opacos");
    return {median:median(values),pixels:values.length};
  };
  const a=read(stripe),b=read(control);
  return {
    stripeMedian:a.median,controlMedian:b.median,
    stripePixels:a.pixels,controlPixels:b.pixels,
    gap:b.median-a.median,
    stripeToControl:b.median>0?a.median/b.median:null
  };
}
/**
 * Quantitative pre-screening only; never declares a visual or anatomical fix.
 * Requires same ROIs and fixed pose/camera/lighting across all captures.
 */
export function screenStripeCandidates(rows,{
  baseline="baseline",minControlRetention=0.85,minRatioGain=0.12
}={}){
  if(!Array.isArray(rows)||!rows.length) throw new TypeError("Faltan mediciones");
  const first=rows.find(r=>r.mode===baseline);
  if(!first||!(first.controlMedian>0)||!Number.isFinite(first.stripeMedian))
    throw new TypeError("Baseline sin ROI validas");
  const baseRatio=first.stripeMedian/first.controlMedian;
  return rows.map(row=>{
    if(!Number.isFinite(row.stripeMedian)||!Number.isFinite(row.controlMedian)
      ||row.stripeMedian<0||row.controlMedian<=0)
      throw new TypeError("ROI numerica invalida: "+row.mode);
    const ratio=row.stripeMedian/row.controlMedian;
    const controlRetention=row.controlMedian/first.controlMedian;
    return {
      mode:row.mode,ratio,controlRetention,
      ratioGain:ratio-baseRatio,
      status:row.mode===baseline?"reference":
        controlRetention<minControlRetention?"global-darkening":
        ratio-baseRatio>=minRatioGain?"candidate-needs-visual-review":
        "no-improvement-evidence",
      certified:false
    };
  });
}
