/**
 * ARC Privus - triangle-level facial stripe audit (runtime GLTF geometry).
 *
 * Observe existing Raycaster hit.faceIndex for the SAME real skinned mesh
 * Mesh_0_1. Read geometry indices, UVs, normals, morph metadata and draw
 * groups without modifying assets. A match of an object to a pixel via ray
 * intersection is NOT proof that its material rendered that pixel: alpha,
 * draw order, clipping, shader normal maps and GPU skinning may intervene.
 *
 * All results are metadata. Do not add private face textures to public GitHub.
 */
function read(attribute,i,axis){
  if(!Number.isInteger(i)||i<0||!attribute)return null;
  const size=attribute.itemSize||1;
  const count=attribute.count;
  if(!Number.isInteger(count)||i>=count||axis>=size)return null;
  const method=["getX","getY","getZ","getW"][axis];
  let value;
  if(typeof attribute[method]==="function")value=attribute[method](i);
  else if(attribute.array)value=attribute.array[i*size+axis];
  return Number.isFinite(value)?value:null;
}
function tuple(attribute,index,n){
  if(!attribute)return null;
  const v=Array.from({length:n},(_,axis)=>read(attribute,index,axis));
  return v.every(Number.isFinite)?v:null;
}
function vertexIndex(geometry,corner){
  if(geometry.index)return read(geometry.index,corner,0);
  return corner;
}
function norm(a){return Math.hypot(...a);}
function triangleMetrics(positions,uvs){
  if(!positions.every(Boolean))return {area:null,normal:null,uvArea:null};
  const [a,b,c]=positions;
  const ab=b.map((x,i)=>x-a[i]),ac=c.map((x,i)=>x-a[i]);
  const cross=[
    ab[1]*ac[2]-ab[2]*ac[1],
    ab[2]*ac[0]-ab[0]*ac[2],
    ab[0]*ac[1]-ab[1]*ac[0]
  ];
  const length=norm(cross);
  const uvArea=uvs.every(Boolean)
    ?((uvs[1][0]-uvs[0][0])*(uvs[2][1]-uvs[0][1])
      -(uvs[1][1]-uvs[0][1])*(uvs[2][0]-uvs[0][0]))/2:null;
  return {area:length/2,
    normal:length>0?cross.map(v=>v/length):null,
    uvArea};
}
function groupOf(geometry,faceIndex){
  const start=faceIndex*3;
  const groups=Array.isArray(geometry.groups)?geometry.groups:[];
  const group=groups.find(g=>
    Number.isInteger(g.start)&&Number.isInteger(g.count)
    &&start>=g.start &&start+2<g.start+g.count);
  return group?{start:group.start,count:group.count,
    materialIndex:group.materialIndex??0}:null;
}
function triangle(mesh,faceIndex){
  const geometry=mesh.geometry;
  const attrs=geometry?.attributes||{};
  const n=geometry?.index?.count??attrs.position?.count;
  if(!Number.isInteger(faceIndex)||faceIndex<0||
    !Number.isInteger(n)||faceIndex*3+2>=n)
    throw new RangeError("faceIndex fuera de geometria");
  const ids=Array.from({length:3},(_,k)=>vertexIndex(geometry,faceIndex*3+k));
  if(ids.some(x=>!Number.isInteger(x)||x<0))throw new Error("Indices de vertices invalidos");
  const positions=ids.map(x=>tuple(attrs.position,x,3));
  const normals=ids.map(x=>tuple(attrs.normal,x,3));
  const uvs=ids.map(x=>tuple(attrs.uv,x,2));
  const m=triangleMetrics(positions,uvs);
  const group=groupOf(geometry,faceIndex);
  const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material];
  const mat=materials[group?.materialIndex??0]||null;
  return {
    faceIndex,vertexIndices:ids,positions,normals,uvs,
    triangleArea:m.area,faceNormal:m.normal,uvArea:m.uvArea,
    group,material:{
      uuid:mat?.uuid??null,name:mat?.name??null,
      transparent:mat?.transparent??null,
      alphaTest:mat?.alphaTest??null,depthTest:mat?.depthTest??null,
      depthWrite:mat?.depthWrite??null,
      mapUuid:mat?.map?.uuid??null,
      normalMapUuid:mat?.normalMap?.uuid??null
    }
  };
}
function hitRead(hit){
  return {
    distance:Number.isFinite(hit.distance)?hit.distance:null,
    uv:hit.uv&&Number.isFinite(hit.uv.x)&&Number.isFinite(hit.uv.y)
      ?[hit.uv.x,hit.uv.y]:null,
    point:hit.point&&[hit.point.x,hit.point.y,hit.point.z].every(Number.isFinite)
      ?[hit.point.x,hit.point.y,hit.point.z]:null,
    faceIndex:hit.faceIndex
  };
}
/**
 * Only accepts raw raycast hits. Do NOT invent faceIndex from an object's name.
 * Each region's array may contain multiple hits from distinct screen rays;
 * caller should save screen XY/ray metadata separately for pixel attribution.
 */
export function auditFacialHitTriangles({
  mesh,stripeHits,controlHits,maxHits=500
}={}){
  if(!mesh?.geometry||!mesh.isMesh && !mesh.isSkinnedMesh)
    throw new TypeError("Malla Three.js real requerida");
  if(!Array.isArray(stripeHits)||!Array.isArray(controlHits))
    throw new TypeError("Se requieren hits de ambas ROI");
  if(!Number.isInteger(maxHits)||maxHits<1||maxHits>2000
    ||stripeHits.length+controlHits.length>maxHits)
    throw new RangeError("Numero de hits invalido");
  const faceCache=new Map();
  const inspect=(hits,region)=>hits.map((hit,i)=>{
    if(hit?.object!==mesh)throw new Error("Hit de objeto ajeno a "+mesh.name);
    if(!Number.isInteger(hit.faceIndex))
      throw new Error("Raycast sin faceIndex real en "+region+" #"+i);
    if(!faceCache.has(hit.faceIndex)){
      faceCache.set(hit.faceIndex,triangle(mesh,hit.faceIndex));
    }
    return {...hitRead(hit),triangle:faceCache.get(hit.faceIndex)};
  });
  const stripe=inspect(stripeHits,"stripe");
  const control=inspect(controlHits,"control");
  const distribution=hits=>{
    const faces={};
    for(const h of hits)faces[h.faceIndex]=(faces[h.faceIndex]||0)+1;
    return faces;
  };
  const morphAttrs=mesh.geometry.morphAttributes||{};
  const morphInfluences=Array.isArray(mesh.morphTargetInfluences)
    ?mesh.morphTargetInfluences:null;
  return {
    audit:"arc.face.triangle-uv-observations.v1",
    object:{name:mesh.name??null,uuid:mesh.uuid??null},
    mappingBasis:"actual Raycaster intersection.faceIndex; not glTF primitive guess",
    stripeHits:stripe,controlHits:control,
    stripeFaceDistribution:distribution(stripe),
    controlFaceDistribution:distribution(control),
    uniqueTriangleCount:faceCache.size,
    morphs:{
      relative:mesh.geometry.morphTargetsRelative??null,
      positionTargets:Array.isArray(morphAttrs.position)?morphAttrs.position.length:0,
      normalTargets:Array.isArray(morphAttrs.normal)?morphAttrs.normal.length:0,
      activeWeights:morphInfluences
        ?morphInfluences.map((weight,index)=>({index,weight}))
          .filter(x=>Number.isFinite(x.weight)&&Math.abs(x.weight)>1e-6):[],
      note:"Morph metadata only; deformed GPU positions are not reproduced"
    },
    verdict:"INCONCLUSIVE_REQUIRES_PIXEL_AND_TEXTURE_VALIDATION",
    sourceModified:false,
    evidenceSaved:false,
    warnings:[
      "Raycaster UV and triangles may differ from final shaded pixel (alpha/morph/skin/GPU)",
      "UV seams, triangle boundaries and normals require spatial comparison with the visible stripe",
      "Identifying a triangle in the ROI is not a demonstrated root cause",
      "Output contains coordinates only; do not publish private biometric textures"
    ]
  };
}
