console.log("ARC PRIVUS LANDING ACTIVADA");

const logo = document.getElementById("logoArc");

let zoom = false;

if(logo){

logo.onclick = () => {

zoom = !zoom;

if(zoom){

logo.classList.add("zoom");

}else{

logo.classList.remove("zoom");

}

};

}