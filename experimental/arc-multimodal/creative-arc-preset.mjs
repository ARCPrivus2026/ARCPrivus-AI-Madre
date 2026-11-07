/**
 * ARC-owned character registry and a coordinated storyboard specimen.
 * Names and planned actions only. DOES NOT contain meshes, photographs,
 * voice recordings, likeness grants, scripts from vendors or private paths.
 */
import {createCreativeUniverse} from './creative-universe.mjs';

export function createArcCreativePreset(){
  const studio=createCreativeUniverse({name:'ARC Privus AI Madre | Universal Creative Studio'});
  studio.registerActor({
    id:'natalia',name:'Natalia',origin:'ARC Copilot Forge',
    rights:'pending_review',rig:'unverified',voice:'unverified'
  });
  studio.registerActor({
    id:'copiloto',name:'Arnold RC',origin:'ARC Copilot Forge',
    rights:'pending_review',rig:'unverified',voice:'unverified'
  });
  studio.createProject({
    id:'arc_piloto_integral',title:'ARC: escena integral de Natalia y Arnold RC',
    kind:'video',cast:['natalia','copiloto'],
    synopsis:'Escena reutilizable de demostracion conjunta con movimiento, rostro y voz.',
    scenes:[{id:'presentacion',durationMs:12000,
      description:'Ambos avatares avanzan, hablan, miran, parpadean y cambian postura.',
      cues:[
        {atMs:0,character:'natalia',action:'idle'},
        {atMs:0,character:'copiloto',action:'idle'},
        {atMs:200,character:'natalia',action:'walk'},
        {atMs:200,character:'copiloto',action:'walk'},
        {atMs:1500,character:'natalia',action:'speak',text:'Bienvenidos a ARC Privus AI Madre.'},
        {atMs:1800,character:'copiloto',action:'look'},
        {atMs:2300,character:'copiloto',action:'blink'},
        {atMs:3400,character:'copiloto',action:'run'},
        {atMs:4000,character:'natalia',action:'blink'},
        {atMs:4300,character:'copiloto',action:'speak',text:'Estamos construyendo un universo de creacion audiovisual reutilizable.'},
        {atMs:5500,character:'natalia',action:'sit'},
        {atMs:7000,character:'natalia',action:'stand'},
        {atMs:7500,character:'copiloto',action:'idle'}
      ]
    }]
  });
  return studio;
}