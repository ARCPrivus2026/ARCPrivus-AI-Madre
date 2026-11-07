/**
 * ARC Privus - non-destructive WebGL PBR channel isolation for Natalia R4.
 *
 * Target explicitly named facial meshes in a LOCAL, isolated GLTF scene.
 * Run sequentially while the scene is not being rendered by another loop.
 * The real materials and texture objects are NEVER edited: variant clones
 * are installed briefly, captured, then the exact originals are restored.
 *
 * This cannot prove a dark stripe's root cause without real WebGL captures.
 */
export const PBR_VARIANTS=Object.freeze([
  "baseline",
  "metal-map-off",
  "rough-map-off",
  "both-maps-off",
  "metal-factor-zero",
  "roughness-constant-one",
  "neutral-skin"
]);

const materialSlots=["metalnessMap","roughnessMap","normalMap","map","envMap"];
const uuidOf=x=>typeof x?.uuid==="string"?x.uuid:null;

function info(material){
  const result={
    name:material.name||null,
    uuid:uuidOf(material),
    isPBR:!!(material.isMeshStandardMaterial||material.isMeshPhysicalMaterial),
    metalness:material.metalness,
    roughness:material.roughness
  };
  for(const key of materialSlots) {
    const texture=material[key];
    result[key]=texture ? {
      uuid:uuidOf(texture),
      name:texture.name||null,
      colorSpace:texture.colorSpace||null,
      channel:Number.isInteger(texture.channel)?texture.channel:null
    } : null;
  }
  result.packedMetalRoughnessMap=!!material.metalnessMap
    && material.metalnessMap===material.roughnessMap;
  return result;
}
function validateMeshNames(meshNames){
  if(!Array.isArray(meshNames)||meshNames.length===0||meshNames.length>50
      ||meshNames.some(x=>typeof x!=="string"||!x.trim()))
    throw new TypeError("meshNames requiere nombres explicitos de mallas faciales");
  const trimmed=meshNames.map(x=>x.trim());
  if(new Set(trimmed).size!==trimmed.length) throw new Error("meshNames duplicados");
  return trimmed;
}
function targets(root,meshNames){
  if(typeof root?.traverse!=="function") throw new TypeError("root.traverse requerido");
  const requested=new Set(validateMeshNames(meshNames));
  const found=new Set(),selected=[];
  root.traverse(node=>{
    if(!node || !(node.isMesh||node.isSkinnedMesh) || !requested.has(node.name)) return;
    found.add(node.name);
    const materials=Array.isArray(node.material)?node.material:[node.material];
    if(!materials.length||materials.some(m=>
      !m || !(m.isMeshStandardMaterial||m.isMeshPhysicalMaterial)
      || typeof m.clone!=="function")) {
      throw new TypeError("Malla "+node.name+" sin material PBR clonable");
    }
    selected.push({node,materials,isArray:Array.isArray(node.material)});
  });
  const missing=[...requested].filter(name=>!found.has(name));
  if(missing.length) throw new Error("Mallas faciales no localizadas: "+missing.join(", "));
  return selected;
}
function applyVariant(material,variant){
  switch(variant){
    case "baseline":return;
    case "metal-map-off":
      material.metalnessMap=null;break;
    case "rough-map-off":
      material.roughnessMap=null;break;
    case "both-maps-off":
      material.metalnessMap=null;material.roughnessMap=null;break;
    case "metal-factor-zero":
      material.metalness=0;break;
    case "roughness-constant-one":
      // Must disconnect roughnessMap: Three.js multiplies scalar and G.
      material.roughnessMap=null;material.roughness=1;break;
    case "neutral-skin":
      material.metalnessMap=null;material.metalness=0;
      material.roughnessMap=null;material.roughness=1;break;
    default:throw new RangeError("Variante no reconocida: "+variant);
  }
  material.needsUpdate=true;
}
/**
 * Example:
 *   await runPBRVariants({
 *     root:gltf.scene,meshNames:["Mesh_0"],
 *     capture:async ({variant,summary})=>screenshotWithFixedCamera(variant)
 *   });
 * Capture MUST await its render/screenshot. No GLB export or save is performed.
 */
export async function runPBRVariants({root,meshNames,variants=PBR_VARIANTS,capture}={}){
  if(typeof capture!=="function") throw new TypeError("capture requerido");
  if(!Array.isArray(variants)||!variants.length
     ||new Set(variants).size!==variants.length
     ||variants.some(x=>!PBR_VARIANTS.includes(x))){
    throw new TypeError("Variantes PBR invalidas");
  }
  const selected=targets(root,meshNames);
  const inventory=selected.flatMap(({node,materials})=>materials.map((material,index)=>({
    mesh:node.name,index,...info(material)
  })));
  const results=[];
  for(const variant of variants){
    const replacements=[];
    try{
      if(variant!=="baseline"){
        // Clone all BEFORE applying any material to the scene.
        for(const {node,materials,isArray} of selected){
          const copies=[];
          for(const original of materials){
            const clone=original.clone();
            if(!clone||clone===original) throw new Error("clone() devolvio material original");
            copies.push(clone);
          }
          replacements.push({node,original:node.material,isArray,copies});
        }
        // Shader changes are applied exclusively to cloned materials.
        for(const entry of replacements){
          for(const clone of entry.copies) applyVariant(clone,variant);
          entry.node.material=entry.isArray?entry.copies:entry.copies[0];
        }
      }
      const summary=selected.flatMap(({node})=>
        (Array.isArray(node.material)?node.material:[node.material])
          .map((material,index)=>({mesh:node.name,index,...info(material)})));
      const captureResult=await capture({
        variant,summary,
        note:"Capture comparable only with fixed camera, light, exposure, pose and output."
      });
      results.push({variant,summary,captureResult});
    }finally{
      // Restoration is unconditional even after render or shader exceptions.
      for(const {node,original,copies} of replacements){
        node.material=original;
        for(const clone of copies) if(typeof clone.dispose==="function") clone.dispose();
      }
    }
  }
  return {
    experiment:"arc.pbr.channel-isolation.v1",
    testOnly:true,
    inventory,
    results,
    restored:true
  };
}
