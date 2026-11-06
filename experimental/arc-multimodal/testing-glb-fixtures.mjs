/** Deterministic, in-memory GLTF skinning fixture; NOT a real rendered GLB. */
export const TEST_LIMB_BONES=["LeftHand","RightHand","LeftFoot","RightFoot"];
function attribute(data,size=4){
  return {
    count:data.length/size,itemSize:size,array:Float32Array.from(data),
    getX(i){return this.array[i*size];},
    getY(i){return this.array[i*size+1];},
    getZ(i){return this.array[i*size+2];},
    getW(i){return this.array[i*size+3];}
  };
}
export function fakeSkinnedLimbMesh({missing=[],malformed=false,name="body"}={}){
  const indexes=[],weights=[];
  for(let target=0;target<TEST_LIMB_BONES.length;target++){
    if(missing.includes(TEST_LIMB_BONES[target])) continue;
    for(let vertex=0;vertex<4;vertex++){
      indexes.push(target,0,0,0);
      weights.push(1,0,0,0);
    }
  }
  if(malformed) return {
    name,isSkinnedMesh:true,
    skeleton:{bones:TEST_LIMB_BONES.map(name=>({name}))},
    geometry:{attributes:{skinIndex:attribute(indexes)}}
  };
  return {
    name,isSkinnedMesh:true,
    skeleton:{bones:TEST_LIMB_BONES.map(name=>({name}))},
    geometry:{attributes:{
      skinIndex:attribute(indexes),skinWeight:attribute(weights)
    }}
  };
}
