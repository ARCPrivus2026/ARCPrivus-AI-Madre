console.log("ARC TRANSLATOR ENGINE CARGADO");

window.ARC_TRANSLATOR={

translate:async function(text,targetLang){

try{

const res=await fetch("/api/translate",{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({
text:text,
to:targetLang
})

});

const data=await res.json();

return data.translated;

}catch(err){

console.warn("Error traduciendo:",err);

return text;

}

}

};