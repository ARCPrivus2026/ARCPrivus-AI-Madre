console.log("ARC PRIVUS LANDING ACTIVADO");

const pantera = document.getElementById("pantera");

let zoom=false;

pantera.onclick=()=>{

zoom=!zoom;

if(zoom){

pantera.style.transform="scale(1.6)";

}else{

pantera.style.transform="scale(1)";

}

};