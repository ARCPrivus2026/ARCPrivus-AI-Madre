/**
 * Optional integration with the user-owned ARC Consciousness Engine V4.0.0.
 * Does not import, overwrite, expose or publish the proprietary/local source.
 * Uses documented registerCognitiveHandler/registerIntegration API.
 */
const HANDLER_PLAN='arc_creative_plan';
const HANDLER_EXECUTE='arc_creative_execute';
const INTEGRATION='arc_creative_studio';

export function attachCreativeToConsciousness({engine,studio}={}){
  const engineMethods=['registerCognitiveHandler','unregisterCognitiveHandler',
    'enqueueCognitiveProcess','processCognitiveItem','registerIntegration',
    'unregisterIntegration'];
  if(!engine||engineMethods.some(x=>typeof engine[x]!=='function'))
    throw new TypeError('Se necesita ARC Consciousness Engine con API V4');
  if(!studio||['blueprint','runCapability','getStatus'].some(x=>typeof studio[x]!=='function'))
    throw new TypeError('Studio creativo no compatible');
  let connected=false;
  try{
    engine.registerCognitiveHandler(HANDLER_PLAN,async payload=>{
      if(!payload || typeof payload.projectId!=='string')throw new TypeError('Falta projectId');
      return studio.blueprint(payload.projectId);
    });
    engine.registerCognitiveHandler(HANDLER_EXECUTE,async payload=>{
      if(!payload || typeof payload!=='object')throw new TypeError('Falta solicitud');
      return studio.runCapability(payload);
    });
    engine.registerIntegration(INTEGRATION,{
      sync:async event=>({integration:INTEGRATION,event,
        // No character images, voice samples, credentials or user messages.
        studio:studio.getStatus()})
    },{enabled:true,required:false,metadata:{
      module:'experimental/arc-multimodal',purpose:'creative-planning',
      billing:'disabled-by-default'
    }});
    connected=true;
  }catch(error){
    engine.unregisterCognitiveHandler(HANDLER_PLAN);
    engine.unregisterCognitiveHandler(HANDLER_EXECUTE);
    engine.unregisterIntegration(INTEGRATION);
    throw error;
  }
  function ensureConnected(){if(!connected)throw new Error('Puente cerrado');}
  return Object.freeze({
    status:()=>({connected,studio:studio.getStatus(),
      source:'ARC Consciousness Engine V4',mainModified:false}),
    enqueuePlan:(projectId,priority='normal')=>{
      ensureConnected();
      return engine.enqueueCognitiveProcess(HANDLER_PLAN,{projectId},{priority,maxAttempts:1});
    },
    enqueueCapability:(options,priority='normal')=>{
      ensureConnected();
      return engine.enqueueCognitiveProcess(HANDLER_EXECUTE,options,{priority,maxAttempts:1});
    },
    process:async itemId=>{
      ensureConnected();
      if(typeof itemId!=='string'||!itemId)throw new TypeError('itemId invalido');
      return engine.processCognitiveItem(itemId);
    },
    dispose:()=>{
      if(!connected)return false;
      connected=false;
      engine.unregisterCognitiveHandler(HANDLER_PLAN);
      engine.unregisterCognitiveHandler(HANDLER_EXECUTE);
      engine.unregisterIntegration(INTEGRATION);
      return true;
    }
  });
}