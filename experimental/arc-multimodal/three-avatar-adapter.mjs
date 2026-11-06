/**
 * ARC Privus - GLTF/Three.js audiovisual adapter.
 * No imports, network, or edits to source GLB. Inject THREE and already-loaded GLTF.
 * A host render loop MUST call update(deltaSeconds); audio is injected.
 */
import {auditAvatarRig} from "./integrated-scene-runtime.mjs";

const HINTS={idle:["idle","rest"],walk:["walk"],run:["run"],sit:["sit"],stand:["stand"]};
const JAW=["jawopen","mouthopen","mouth_open"];
const BLINK=["eyeblink","blink","eyeblinkleft","eyeblinkright","blinkleft","blinkright"];

const uniq=x=>[...new Set(x)];
function morphsOf(node){
  return node.morphTargetDictionary && Array.isArray(node.morphTargetInfluences)
    ? Object.keys(node.morphTargetDictionary) : [];
}
function setMorph(meshes,aliases,value){
  let updated=0;
  for(const mesh of meshes){
    const map=mesh.morphTargetDictionary || {};
    for(const [key,index] of Object.entries(map)){
      if(aliases.includes(key.toLowerCase()) && Number.isInteger(index)
          && index>=0 && index<mesh.morphTargetInfluences.length){
        mesh.morphTargetInfluences[index]=value;
        updated++;
      }
    }
  }
  return updated;
}
export function inspectLoadedGlb(gltf,{clipMap={},voiceEnabled=false}={}){
  if(!gltf?.scene || typeof gltf.scene.traverse!=="function"
      || !Array.isArray(gltf.animations)) throw new TypeError("Se requiere un GLTF cargado");
  if(!clipMap || typeof clipMap!=="object" || Array.isArray(clipMap)){
    throw new TypeError("clipMap debe ser objeto");
  }
  const bones=[], morphs=[], meshes=[];
  gltf.scene.traverse(node=>{
    if(node.isBone || node.type==="Bone") bones.push(node.name);
    if(Array.isArray(node.skeleton?.bones)) bones.push(...node.skeleton.bones.map(b=>b.name));
    const names=morphsOf(node);
    if(names.length){morphs.push(...names);meshes.push(node);}
  });
  const clips=gltf.animations.map(c=>c.name).filter(n=>typeof n==="string");
  const resolved={};
  for(const [motion,hints] of Object.entries(HINTS)){
    if(clipMap[motion]){
      if(!clips.includes(clipMap[motion])) throw new Error("Clip declarado inexistente: "+clipMap[motion]);
      resolved[motion]=clipMap[motion];
    }else{
      const match=clips.find(name=>hints.includes(name.toLowerCase()))
        ||clips.find(name=>hints.some(h=>name.toLowerCase().includes(h)));
      if(match) resolved[motion]=match;
    }
  }
  const manifest={
    bones:uniq(bones),morphs:uniq(morphs),clips,clipMap:resolved,voiceEnabled
  };
  return {manifest,audit:auditAvatarRig(manifest),meshes};
}

/**
 * Actors: {natalia:{gltf,speaker,look?,clipMap?},copiloto:{...}}
 * speaker.start({text,character,onStart,onEnd,onJawLevel})
 * -> {done: Promise,stop?:function}.
 * The call acknowledges START, not the completion of speech.
 */
export function createThreeAvatarAdapter({THREE,actors,fadeSeconds=0.2}={}){
  if(typeof THREE?.AnimationMixer!=="function") throw new TypeError("THREE.AnimationMixer requerido");
  if(!actors || typeof actors!=="object") throw new TypeError("Faltan actores");
  if(!Number.isFinite(fadeSeconds)||fadeSeconds<0||fadeSeconds>2) throw new RangeError("fadeSeconds invalido");
  const states=new Map();
  let disposed=false;
  for(const name of ["natalia","copiloto"]){
    const cfg=actors[name];
    if(!cfg) continue;
    const inspection=inspectLoadedGlb(cfg.gltf,{
      clipMap:cfg.clipMap||{},voiceEnabled:typeof cfg.speaker?.start==="function"
    });
    states.set(name,{
      cfg,mixer:new THREE.AnimationMixer(cfg.gltf.scene),...inspection,
      active:null,speaking:false,voicePending:false,phase:0,jawLevel:null,blinkLeft:0,
      voices:new Set(),errors:[]
    });
  }
  const manifests=Object.fromEntries([...states].map(([name,state])=>[name,state.manifest]));
  function get(event){
    if(disposed) throw new Error("Adaptador ya cerrado");
    const state=states.get(event?.command?.character);
    if(!state) throw new Error("Personaje no registrado: "+event?.command?.character);
    if(!state.audit.ready) throw new Error("Rig incompleto: "+state.audit.issues.join("; "));
    return state;
  }
  return {
    manifests,
    inspect(name){
      const state=states.get(name);
      if(!state) throw new Error("Personaje no registrado: "+name);
      return {manifest:state.manifest,audit:state.audit};
    },
    async motion(event){
      const state=get(event);
      if(event.channel!=="motion") throw new TypeError("Canal incorrecto");
      const clipName=state.manifest.clipMap[event.command.action];
      const clip=state.cfg.gltf.animations.find(c=>c.name===clipName);
      if(!clip) throw new Error("Clip no disponible: "+event.command.action);
      const next=state.mixer.clipAction(clip);
      if(state.active && state.active!==next){
        if(fadeSeconds && typeof state.active.fadeOut==="function") state.active.fadeOut(fadeSeconds);
        else state.active.stop();
      }
      next.reset();
      next.setEffectiveTimeScale(event.command.speed);
      if(fadeSeconds) next.fadeIn(fadeSeconds);
      next.play();
      state.active=next;
      return {started:true,clip:clipName};
    },
    async face(event){
      const state=get(event);
      if(event.channel!=="face") throw new TypeError("Canal incorrecto");
      if(event.command.action==="blink"){
        if(!setMorph(state.meshes,BLINK,1)) throw new Error("No existe morph de parpadeo");
        state.blinkLeft=0.12;
      }else if(event.command.action==="look"){
        if(typeof state.cfg.look!=="function") throw new Error("Sin controlador de mirada");
        await state.cfg.look({root:state.cfg.gltf.scene,character:event.command.character});
      }else throw new Error("Accion de rostro no compatible");
      return {started:true};
    },
    async voice(event){
      const state=get(event);
      if(event.channel!=="voice") throw new TypeError("Canal incorrecto");
      if(state.speaking || state.voicePending) throw new Error("Ya esta hablando o tiene voz pendiente");
      state.voicePending=true;
      let handle;
      try{
        handle=await state.cfg.speaker.start({
          text:event.command.text,character:event.command.character,
          onStart:()=>{state.speaking=true;},
          onEnd:()=>{state.speaking=false;state.jawLevel=0;setMorph(state.meshes,JAW,0);},
          onJawLevel:x=>{if(Number.isFinite(x))state.jawLevel=Math.max(0,Math.min(1,x));}
        });
        if(typeof handle?.done?.then!=="function") throw new TypeError("Voz debe devolver {done: Promise}");
      }catch(error){state.speaking=false;state.voicePending=false;throw error;}
      const record={handle,task:null};
      state.voices.add(record);
      record.task=Promise.resolve(handle.done).catch(error=>{
        state.errors.push(String(error?.message||error));
      }).finally(()=>{
        state.speaking=false;
        state.voicePending=false;
        state.jawLevel=0;
        setMorph(state.meshes,JAW,0);
        state.voices.delete(record);
      });
      return {started:true};
    },
    update(deltaSeconds){
      if(disposed) return;
      if(!Number.isFinite(deltaSeconds)||deltaSeconds<0) throw new RangeError("deltaSeconds invalido");
      const delta=Math.min(deltaSeconds,0.1);
      for(const state of states.values()){
        state.mixer.update(delta);
        if(state.blinkLeft>0){
          state.blinkLeft-=delta;
          if(state.blinkLeft<=0) setMorph(state.meshes,BLINK,0);
        }
        if(state.speaking){
          state.phase+=delta;
          const level=state.jawLevel==null
            ?0.15+Math.abs(Math.sin(state.phase*14))*0.3:state.jawLevel;
          setMorph(state.meshes,JAW,level);
        }
      }
    },
    async waitForVoices(){
      await Promise.all([...states.values()].flatMap(s=>[...s.voices].map(v=>v.task)));
      const errors=[...states.values()].flatMap(s=>s.errors.splice(0));
      if(errors.length) throw new Error("Errores de voz: "+errors.join(" | "));
    },
    dispose(){
      if(disposed) return;
      disposed=true;
      for(const s of states.values()){
        for(const v of s.voices) if(typeof v.handle.stop==="function") v.handle.stop();
        s.mixer.stopAllAction();
        s.mixer.uncacheRoot(s.cfg.gltf.scene);
        setMorph(s.meshes,JAW,0);
        setMorph(s.meshes,BLINK,0);
      }
    }
  };
}