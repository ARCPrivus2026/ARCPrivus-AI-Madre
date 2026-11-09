/**
 * ARC Privus R5 - split an aggregate "Runtime GLTF binding mismatch" into
 * evidence from GLTF JSON, live GLTFLoader association map and live material.map.
 *
 * Read-only / no network / no image access or writes. Never use an object name
 * or UUID to INVENT a glTF index. If GLTFLoader's live associations are absent,
 * classify as UNKNOWN rather than silently accepting the source JSON match.
 */
function integer(v){return Number.isInteger(v)&&v>=0?v:null;}
function assoc(parser,obj,key){
  const record=obj&&parser?.associations?.get?.(obj);
  return integer(record?.[key]);
}
function cmp(actual,expected){
  if(expected===null)return "NOT_REQUESTED";
  if(actual===null)return "UNKNOWN";
  return actual===expected?"MATCH":"MISMATCH";
}
function pickObject(root,name){
  if(typeof root?.traverse!=="function")throw new TypeError("GLTF scene.traverse required");
  if(typeof name!=="string"||!name.trim())throw new TypeError("Unique mesh name required");
  const items=[];
  root.traverse(node=>{
    if(node?.name===name&&(node.isMesh||node.isSkinnedMesh))items.push(node);
  });
  if(items.length!==1)throw new Error("Mesh missing or ambiguous: "+name+" ("+items.length+")");
  return items[0];
}
/**
 * expected* index fields are optional, but tests may only be classified as
 * MATCH if ALL FOUR are present and verified via runtime association/source.
 *
 * gltfMeshIndex, primitiveIndex, gltfMaterialIndex, gltfTextureIndex
 * are source glTF indices, not Three.js UUIDs, material slots or draw groups.
 */
export function diagnoseFaceGLTFBinding({
  gltf,meshName="Mesh_0_1",materialSlot=0,expected={}
}={}){
  if(!gltf?.parser?.json?.meshes||!gltf?.scene)
    throw new TypeError("Real GLTFLoader result with scene and parser JSON required");
  if(!Number.isInteger(materialSlot)||materialSlot<0)
    throw new RangeError("Invalid materialSlot");
  const mesh=pickObject(gltf.scene,meshName);
  const parser=gltf.parser,json=parser.json;
  const mats=Array.isArray(mesh.material)?mesh.material:[mesh.material];
  if(materialSlot>=mats.length||!mats[materialSlot])
    throw new RangeError("Material slot is not present on facial mesh");
  const material=mats[materialSlot],texture=material.map??null;
  // Live runtime association; may be null when GLTFLoader cloned materials.
  const meshIdx=assoc(parser,mesh,"meshes");
  const primitiveIdx=assoc(parser,mesh,"primitives");
  const matIdx=assoc(parser,material,"materials");
  const texIdx=assoc(parser,texture,"textures");
  const sourceMesh=meshIdx!==null?json.meshes[meshIdx]:null;
  const sourcePrimitive=primitiveIdx!==null
    ?sourceMesh?.primitives?.[primitiveIdx]:null;
  const jsonMatIndex=integer(sourcePrimitive?.material);
  const jsonMat=jsonMatIndex!==null?json.materials?.[jsonMatIndex]:null;
  const jsonTextureIndex=integer(
    jsonMat?.pbrMetallicRoughness?.baseColorTexture?.index
  );
  const expectKeys=[
    "gltfMeshIndex","primitiveIndex",
    "gltfMaterialIndex","gltfTextureIndex"
  ];
  const normalized={};
  for(const key of expectKeys){
    const raw=expected?.[key];
    if(raw===undefined||raw===null)normalized[key]=null;
    else if(integer(raw)===null)throw new TypeError("Invalid expected "+key);
    else normalized[key]=raw;
  }
  const rows=[
    {field:"mesh",expected:normalized.gltfMeshIndex,runtime:meshIdx,
      source:null,associationType:"GLTFLoader associations.get(mesh).meshes"},
    {field:"primitive",expected:normalized.primitiveIndex,runtime:primitiveIdx,
      source:null,associationType:"GLTFLoader associations.get(mesh).primitives"},
    {field:"material",expected:normalized.gltfMaterialIndex,runtime:matIdx,
      source:jsonMatIndex,associationType:"GLTFLoader associations.get(material).materials"},
    {field:"albedoTexture",expected:normalized.gltfTextureIndex,runtime:texIdx,
      source:jsonTextureIndex,associationType:"GLTFLoader associations.get(material.map).textures"}
  ].map(row=>({
    ...row,
    runtimeCheck:cmp(row.runtime,row.expected),
    sourceCheck:row.source===null?"UNKNOWN":cmp(row.source,row.expected),
    associationVsSource:row.source===null||row.runtime===null
      ?"UNKNOWN":cmp(row.runtime,row.source)
  }));
  const mismatches=rows.filter(x=>
    x.runtimeCheck==="MISMATCH"||x.sourceCheck==="MISMATCH"
    ||x.associationVsSource==="MISMATCH");
  const allExpected=Object.values(normalized).every(v=>v!==null);
  const verified=allExpected
    &&rows.every(x=>x.runtimeCheck==="MATCH")
    &&rows.filter(x=>x.field==="material"||x.field==="albedoTexture")
      .every(x=>x.sourceCheck==="MATCH"&&x.associationVsSource==="MATCH");
  const status=mismatches.length?"MISMATCH":
    verified?"ALL_BINDINGS_MATCH":"MISSING_ASSOCIATION_OR_EXPECTATION";
  return {
    audit:"arc.r5.gltf-binding-split.v1",
    status,canCertifyBinding:verified,
    mesh:{
      name:mesh.name,uuid:mesh.uuid??null,
      materialSlot,materialName:material.name??null,
      materialUuid:material.uuid??null,
      texturePresent:!!texture,textureUuid:texture?.uuid??null,
      drawGroupCount:Array.isArray(mesh.geometry?.groups)
        ?mesh.geometry.groups.length:0
    },
    source:{
      gltfMeshIndex:meshIdx,primitiveIndex:primitiveIdx,
      primitiveMaterialIndex:jsonMatIndex,
      materialBaseColorTextureIndex:jsonTextureIndex,
      parserAssociationAvailable:typeof parser.associations?.get==="function"
    },
    comparisons:rows,
    mismatchFields:mismatches.map(x=>x.field),
    didCompareTextureBytes:false,sourceModified:false,
    note:"This diagnostic does NOT correct any mismatch or grant permission to bypass runner checks",
    warnings:[
      "Material/texture association can be missing after GLTFLoader clones; do not guess indices",
      "GLTF JSON material/texture indices are source-level, not proof of live material binding",
      "A Three.js Texture.uuid may change each session and is not a stable content identity",
      "Source material may contain baseColorTexture even if runtime material.map is absent",
      "Read and save each runtime and source field before deciding what needs repair"
    ]
  };
}
