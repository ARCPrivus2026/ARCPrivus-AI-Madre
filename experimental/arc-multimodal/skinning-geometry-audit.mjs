/**
 * ARC Privus: auditoria NO destructiva del skinning de un GLTF ya cargado.
 * Verifica que los huesos de ambas manos y pies tengan influencia medible
 * sobre vertices de mallas SkinnedMesh. NO demuestra que la mano sea visible
 * ni que su topologia o la animacion sean correctas.
 *
 * No modifica geometria y NO realiza peticiones de red.
 */
const TARGETS=Object.freeze({
  leftHand:["lefthand","hand_l","left_hand","mixamoriglefthand"],
  rightHand:["righthand","hand_r","right_hand","mixamorigrighthand"],
  leftFoot:["leftfoot","foot_l","left_foot","mixamorigleftfoot"],
  rightFoot:["rightfoot","foot_r","right_foot","mixamorigrightfoot"]
});
const COMPONENTS=["getX","getY","getZ","getW"];
function readChannel(attribute,index,channel) {
  const fn=attribute?.[COMPONENTS[channel]];
  if(typeof fn==="function") return fn.call(attribute,index);
  const itemSize=attribute?.itemSize;
  if(!Number.isInteger(itemSize) || itemSize<channel+1
      || !ArrayBuffer.isView(attribute.array)) return NaN;
  return Number(attribute.array[index*itemSize+channel]);
}
function finiteCount(attribute) {
  return Number.isInteger(attribute?.count) && attribute.count>=0
    ?attribute.count:null;
}

/** Result object: status analyzed/unavailable; target counts and reasons. */
export function inspectSkinInfluence(gltf,{minWeight=0.05,minVertices=3}={}){
  if(!gltf?.scene || typeof gltf.scene.traverse!=="function")
    throw new TypeError("GLTF.scene.traverse requerido");
  if(!Number.isFinite(minWeight)||minWeight<=0||minWeight>1)
    throw new RangeError("minWeight debe estar entre 0 y 1");
  if(!Number.isInteger(minVertices)||minVertices<1||minVertices>1000)
    throw new RangeError("minVertices fuera de rango");
  const counters=Object.fromEntries(Object.keys(TARGETS).map(name=>[
    name,{count:0,bones:[],meshes:[]}
  ]));
  const warnings=[];
  let skinnedMeshes=0;
  let inspectedMeshes=0;
  gltf.scene.traverse(mesh=>{
    if(!mesh?.isSkinnedMesh) return;
    skinnedMeshes++;
    const bones=mesh.skeleton?.bones;
    const attrs=mesh.geometry?.attributes;
    const indices=attrs?.skinIndex, weights=attrs?.skinWeight;
    const vertices=finiteCount(indices);
    const weightCount=finiteCount(weights);
    const label=mesh.name || "malla sin nombre";
    if(!Array.isArray(bones)||!indices||!weights
      ||vertices===null||weightCount!==vertices||vertices===0){
      warnings.push(label+": datos de skinning incompletos");
      return;
    }
    inspectedMeshes++;
    const boneMatches={};
    for(const [target,aliases] of Object.entries(TARGETS)){
      const indexes=[];
      bones.forEach((bone,i)=>{
        if(aliases.includes(String(bone?.name||"").toLowerCase())) indexes.push(i);
      });
      boneMatches[target]=new Set(indexes);
      const record=counters[target];
      for(const index of indexes) if(!record.bones.includes(bones[index].name))
        record.bones.push(bones[index].name);
    }
    const local=Object.fromEntries(Object.keys(TARGETS).map(x=>[x,0]));
    for(let v=0;v<vertices;v++){
      for(const [target,indexes] of Object.entries(boneMatches)){
        if(!indexes.size) continue;
        let influenced=false;
        const slots=Math.min(4,indices.itemSize||4,weights.itemSize||4);
        for(let k=0;k<slots;k++){
          const boneIndex=readChannel(indices,v,k);
          const weight=readChannel(weights,v,k);
          if(indexes.has(boneIndex)&&Number.isFinite(weight)&&weight>=minWeight){
            influenced=true;
            break;
          }
        }
        if(influenced) local[target]++;
      }
    }
    for(const [target,count] of Object.entries(local)){
      counters[target].count+=count;
      if(count>0) counters[target].meshes.push(label);
    }
  });
  const status=skinnedMeshes===0||inspectedMeshes===0?"unavailable":"analyzed";
  const targets=Object.fromEntries(Object.entries(counters).map(([name,info])=>[
    name,Object.freeze({
      vertices:info.count,
      bones:Object.freeze([...info.bones]),
      meshes:Object.freeze([...info.meshes]),
      verdict:status==="unavailable"?"unknown":(
        info.count>=minVertices?"weighted":"insufficient"
      )
    })
  ]));
  const issues=[];
  if(status==="unavailable") issues.push("sin geometria SkinnedMesh verificable");
  if(skinnedMeshes>inspectedMeshes) issues.push("mallas skinned sin datos completos");
  if(status==="analyzed"){
    for(const [target,item] of Object.entries(targets)){
      if(item.verdict==="insufficient"){
        issues.push("influencia insuficiente: "+target+" ("+item.vertices+" vertices)");
      }
    }
  }
  return Object.freeze({
    status,skinnedMeshes,inspectedMeshes,minWeight,minVertices,
    targets:Object.freeze(targets),
    warnings:Object.freeze(warnings),
    issues:Object.freeze(issues),
    ready:issues.length===0
  });
}
