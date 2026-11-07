/**
 * ARC Privus — runtime scene/material provenance audit for Natalia.
 *
 * Non-destructive. Works on an already-loaded THREE GLTF object.
 * Distinguishes draw groups from glTF source primitives. The GLTFLoader
 * association map is optional and cannot always identify the primitive of
 * a particular Three.js object. NEVER guess that a Three node suffix
 * identifies a glTF primitive index.
 *
 * Return value is plain JSON-compatible data; the Windows laboratory is
 * responsible for actually saving and verifying it before running captures.
 */

function finite(value){return Number.isFinite(value)?value:null;}
function materialRecord(material,index,parser){
  const associated=parser?.associations?.get?.(material)||null;
  return {
    slot:index,uuid:material?.uuid??null,name:material?.name??null,
    type:material?.type??null,side:material?.side??null,
    visible:material?.visible??null,transparent:material?.transparent??null,
    opacity:finite(material?.opacity),alphaTest:finite(material?.alphaTest),
    depthTest:material?.depthTest??null,depthWrite:material?.depthWrite??null,
    colorWrite:material?.colorWrite??null,
    polygonOffset:material?.polygonOffset??null,
    mapUuid:material?.map?.uuid??null,
    alphaMapUuid:material?.alphaMap?.uuid??null,
    normalMapUuid:material?.normalMap?.uuid??null,
    gltfMaterialIndex:Number.isInteger(associated?.materials)
      ?associated.materials:null
  };
}
function nodePath(node,root){
  const names=[];let current=node;
  for(let depth=0;current&&depth<100;depth++){
    const label=String(current.name||current.type||"Object3D");
    const siblings=current.parent?.children;
    const position=Array.isArray(siblings)?siblings.indexOf(current):-1;
    names.push(label+(position>=0?"["+position+"]":""));
    if(current===root) break;
    current=current.parent;
  }
  return names.reverse().join("/");
}
export function inventoryLoadedFacePrimitives(gltf,{includeMaterialSlots=true}={}){
  if(typeof gltf?.scene?.traverse!=="function")
    throw new TypeError("GLTF.scene.traverse requerido");
  const parser=gltf.parser||null;
  const sourceMeshes=parser?.json?.meshes;
  const records=[];
  gltf.scene.traverse(node=>{
    if(!(node?.isMesh||node?.isSkinnedMesh))return;
    const mat=Array.isArray(node.material)?node.material:[node.material];
    const geometry=node.geometry;
    const groups=Array.isArray(geometry?.groups)?geometry.groups.map((g,i)=>({
      drawGroup:i,start:g.start,count:g.count,materialIndex:g.materialIndex
    })):[];
    const associated=parser?.associations?.get?.(node)||null;
    const meshIndex=Number.isInteger(associated?.meshes)?associated.meshes:null;
    const nodeIndex=Number.isInteger(associated?.nodes)?associated.nodes:null;
    const source=meshIndex!==null && Array.isArray(sourceMeshes)
      ?sourceMeshes[meshIndex]:null;
    records.push({
      path:nodePath(node,gltf.scene),uuid:node.uuid??null,name:node.name??null,
      parentName:node.parent?.name??null,parentUuid:node.parent?.uuid??null,
      visible:node.visible??null,renderOrder:finite(node.renderOrder),
      frustumCulled:node.frustumCulled??null,
      isSkinnedMesh:!!node.isSkinnedMesh,
      geometry:{
        uuid:geometry?.uuid??null,
        indexed:!!geometry?.index,
        indexCount:finite(geometry?.index?.count),
        vertexCount:finite(geometry?.attributes?.position?.count),
        drawRangeStart:finite(geometry?.drawRange?.start),
        drawRangeCount:finite(geometry?.drawRange?.count),
        groups,
        // A draw group is not necessarily an original glTF primitive.
        groupCount:groups.length
      },
      materials:includeMaterialSlots?mat.map((m,i)=>materialRecord(m,i,parser)):[],
      provenance:{
        gltfNodeIndex:nodeIndex,gltfMeshIndex:meshIndex,
        gltfSourcePrimitiveCount:Array.isArray(source?.primitives)
          ?source.primitives.length:null,
        primitiveIndex:null,
        mappingConfidence:source
          ?"mesh-level association only; primitive index not established"
          :"unknown — GLTFLoader association unavailable"
      }
    });
  });
  return {
    audit:"arc.face.runtime-mesh-provenance.v1",
    modelSource:"loaded-GLTF-runtime-not-original-file-export",
    objects:records,
    objectCount:records.length,
    missingProvenance:records.filter(x=>x.provenance.gltfMeshIndex===null).length,
    artifactSaved:false,
    originalModified:false,
    warnings:[
      "Los nombres Mesh_0_1 no identifican por si solos primitivas del GLB",
      "Los geometry.groups son segmentos de dibujo, no índices glTF certificados",
      "Los datos deben persistirse y verificarse en un JSON local antes de interpretarlos",
      "La atribución por raycaster necesita guardar hits/distance y cotejar capturas reales"
    ]
  };
}
