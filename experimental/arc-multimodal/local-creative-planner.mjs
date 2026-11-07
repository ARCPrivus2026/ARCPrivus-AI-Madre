/**
 * ARC Local Planning Provider: deterministic planning, no AI/network/cost.
 * Produces editable structures (outlines and shotlists), never renders media.
 */
const CAP=['script','storyboard','layout','safety'];
const SCHEMA='arc.creative.local.planner.v1';
export function createLocalPlanningResult(job){
  if(!job||!job.plan||!job.plan.project||!Array.isArray(job.plan.shots))
    throw new TypeError('Plan creativo no compatible');
  const {project,shots,blockers}=job.plan;
  const sections=shots.map((scene,i)=>({
    sequence:i+1,id:scene.id,setting:scene.description||'Escenario por definir',
    durationMs:scene.durationMs,actions:scene.cues.map(c=>({
      atMs:c.atMs,actor:c.character,direction:c.action,
      dialogue:c.action==='speak'?c.text:null
    }))
  }));
  let result;
  switch(job.capability){
    case 'script':
      result={format:'guion_estructurado',title:project.title,
        sequences:sections.map(s=>({heading:'ESCENA '+s.sequence,
          setting:s.setting,lines:s.actions.map(a=>(a.dialogue?{
            atMs:a.atMs,character:a.actor,kind:'dialogue',content:a.dialogue
          }:{atMs:a.atMs,character:a.actor,kind:'direction',content:a.direction}))}))};
      break;
    case 'storyboard':
      result={format:'plan_de_planos',title:project.title,
        frames:sections.flatMap(s=>s.actions.map((a,index)=>({
          shotId:s.id+'_'+(index+1),atMs:a.atMs,character:a.actor,
          description:a.dialogue?'Primer plano propuesto para habla':'Accion: '+a.direction,
          cue:a.direction,rendered:false
        })))};
      break;
    case 'layout':
      result={format:'esquema_editorial',title:project.title,
        chapters:sections.map(s=>({chapter:s.sequence,title:s.setting,
          summary:'Capitulo pendiente de escritura y revision editorial',
          wordCountActual:0}))};
      break;
    case 'safety':
      result={format:'revision_preproduccion',blockers:[...blockers],
        approvedForRelease:false,requiresHumanReview:true};
      break;
    default:throw new Error('Capacidad local no implementada');
  }
  return {schema:SCHEMA,projectId:project.id,kind:project.kind,
    capability:job.capability,output:result,generatedBy:'arc_local_deterministic',
    isGenerativeAI:false,mediaProduced:false,
    note:'Borrador estructural; requiere escritura, derechos y revision creativa antes de producir.'};
}
export function registerArcLocalPlanning(studio){
  if(typeof studio?.registerProvider!=='function')throw new TypeError('Studio no compatible');
  return studio.registerProvider({id:'arc_local_planning',capabilities:CAP,
    license:'owned',authorized:true,enabled:true,costMode:'none',
    run:async job=>createLocalPlanningResult(job)});
}