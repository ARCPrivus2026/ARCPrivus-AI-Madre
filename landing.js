console.log("ARC PRIVUS LANDING ACTIVADO");

/* =====================
   LOGO INTERACTIVO
===================== */

const logo = document.getElementById("logoArc");

if(logo){

let zoom = false;

logo.onclick = () => {

zoom = !zoom;

if(zoom){
logo.classList.add("zoom");
}else{
logo.classList.remove("zoom");
}

};

}

/* =====================
   PARTICULAS
===================== */

const canvas = document.getElementById("particles");

if(canvas){

const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let particles = [];

for(let i=0;i<80;i++){

particles.push({
x:Math.random()*canvas.width,
y:Math.random()*canvas.height,
r:Math.random()*2
});

}

function draw(){

ctx.clearRect(0,0,canvas.width,canvas.height);

ctx.fillStyle="rgba(0,255,200,0.6)";

particles.forEach(p=>{

ctx.beginPath();
ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
ctx.fill();

p.y -= 0.2;

if(p.y < 0){
p.y = canvas.height;
}

});

requestAnimationFrame(draw);

}

draw();

}