import test from "node:test";
import assert from "node:assert/strict";
import {PBR_VARIANTS,runPBRVariants} from "./pbr-facial-channel-isolation.mjs";

class Material {
  constructor(){
    this.name="PielNatalia";
    this.uuid="source";
    this.isMeshStandardMaterial=true;
    this.metalness=1;
    this.roughness=1;
    const packed={uuid:"Image_1",name:"Image_1",colorSpace:"",channel:0};
    this.metalnessMap=packed;
    this.roughnessMap=packed;
    this.normalMap={uuid:"normal",colorSpace:""};
    this.map={uuid:"albedo",colorSpace:"srgb"};
    this.envMap={uuid:"studio"};
    this.disposed=false;
  }
  clone(){
    const copy=Object.assign(Object.create(Material.prototype),this);
    copy.uuid="clone";
    copy.disposed=false;
    return copy;
  }
  dispose(){this.disposed=true;}
}
function scene(){
  const face={name:"Mesh_0",isMesh:true,material:new Material()};
  const other={name:"eyelash",isMesh:true,material:new Material()};
  return {
    face,other,
    root:{traverse(fn){[face,other].forEach(fn);}}
  };
}
test("PBR: reconoce Image_1 compartida entre canales G y B",async()=>{
  const {root,face}=scene();
  const output=await runPBRVariants({root,meshNames:["Mesh_0"],
    variants:["baseline"],capture:async x=>x.variant});
  assert.equal(output.inventory[0].packedMetalRoughnessMap,true);
  assert.equal(output.inventory[0].metalnessMap.name,"Image_1");
  assert.equal(output.results[0].captureResult,"baseline");
  assert.equal(face.material.uuid,"source");
});
test("PBR: aísla metalnessMap, roughnessMap y factores por separado",async()=>{
  const {root,face,other}=scene(),original=face.material;
  const otherMaterial=other.material;
  const results=await runPBRVariants({
    root,meshNames:["Mesh_0"],capture:async ({variant,summary})=>{
      const live=face.material;
      assert.equal(other.material,otherMaterial);
      assert.equal(summary[0].name,"PielNatalia");
      if(variant==="baseline"){
        assert.equal(live,original);
      } else {
        assert.notEqual(live,original);
        assert.notEqual(live.metalnessMap?.uuid,"unexpected");
      }
      return {
        metal:live.metalness,
        rough:live.roughness,
        metalMap:live.metalnessMap,
        roughMap:live.roughnessMap,
        albedo:live.map,normal:live.normalMap,env:live.envMap
      };
    }
  });
  const byName=Object.fromEntries(results.results.map(x=>[x.variant,x.captureResult]));
  assert.deepEqual(PBR_VARIANTS.map(x=>x),results.results.map(x=>x.variant));
  assert.equal(byName["metal-map-off"].metalMap,null);
  assert.notEqual(byName["metal-map-off"].roughMap,null);
  assert.equal(byName["rough-map-off"].roughMap,null);
  assert.notEqual(byName["rough-map-off"].metalMap,null);
  assert.equal(byName["both-maps-off"].roughMap,null);
  assert.equal(byName["both-maps-off"].metalMap,null);
  assert.equal(byName["metal-factor-zero"].metal,0);
  assert.equal(byName["metal-factor-zero"].metalMap,original.metalnessMap);
  assert.equal(byName["roughness-constant-one"].roughMap,null);
  assert.equal(byName["roughness-constant-one"].rough,1);
  assert.equal(byName["neutral-skin"].metal,0);
  assert.equal(byName["neutral-skin"].rough,1);
  assert.equal(byName["neutral-skin"].roughMap,null);
  assert.equal(byName["neutral-skin"].metalMap,null);
  for(const v of Object.values(byName)){
    assert.equal(v.albedo,original.map);
    assert.equal(v.normal,original.normalMap);
    assert.equal(v.env,original.envMap);
  }
  assert.equal(face.material,original);
  assert.equal(other.material,otherMaterial);
  assert.equal(original.disposed,false);
});
test("PBR: fallar la captura siempre restaura exactamente la referencia original",async()=>{
  const {root,face}=scene(),original=face.material;
  await assert.rejects(
    runPBRVariants({root,meshNames:["Mesh_0"],variants:["metal-map-off"],
      capture:async()=>{throw new Error("Error WebGL sintético");}}),
    /Error WebGL sintético/
  );
  assert.equal(face.material,original);
  assert.equal(original.metalnessMap,original.roughnessMap);
  assert.equal(original.disposed,false);
});
test("PBR: materiales múltiples, cada original se recupera exactamente",async()=>{
  const {root,face}=scene();
  const originals=[new Material(),new Material()];
  face.material=originals;
  await runPBRVariants({root,meshNames:["Mesh_0"],
    variants:["neutral-skin"],capture:async()=>{assert.equal(face.material.length,2);}});
  assert.equal(face.material,originals);
  assert.equal(face.material[0],originals[0]);
  assert.equal(face.material[1],originals[1]);
});
test("PBR: evita seleccionar inadvertidamente el cuerpo entero",async()=>{
  const {root}=scene();
  await assert.rejects(
    runPBRVariants({root,meshNames:["Mesh_999"],capture:async()=>{}}),
    /no localizadas/
  );
  await assert.rejects(
    runPBRVariants({root,meshNames:[],capture:async()=>{}}),
    /nombres explicitos/
  );
});
test("PBR: rechaza material no PBR y variantes no reconocidas",async()=>{
  const {root,face}=scene();
  face.material.isMeshStandardMaterial=false;
  await assert.rejects(
    runPBRVariants({root,meshNames:["Mesh_0"],capture:async()=>{}}),
    /sin material PBR clonable/
  );
  const again=scene();
  await assert.rejects(
    runPBRVariants({root:again.root,meshNames:["Mesh_0"],
      variants:["unlit-no-validado"],capture:async()=>{}}),
    /Variantes PBR invalidas/
  );
});
