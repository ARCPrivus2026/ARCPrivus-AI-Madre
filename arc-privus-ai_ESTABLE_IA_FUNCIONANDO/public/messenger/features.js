export async function processCommand(text, chatEl){
  const t = text.trim().toUpperCase();

  // TRADUCIR: hola | ingles
  if(t.startsWith("TRADUCIR:")){
    return true; // lo maneja tu IA real luego
  }

  // VIAJE: ...
  if(t.startsWith("VIAJE:")){
    return true;
  }

  return false;
}

export function runFeature(feature, api){
  if(feature === "camera"){
    api.openCamera?.();
    return;
  }
  // Las demás se conectan con IA después
  alert("Función: " + feature + " (lista para conectar a IA)");
}