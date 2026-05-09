console.log("ARC CAMERA ACTIVADA");

const cameraBtn = document.getElementById("openCamera");
const cameraModal = document.getElementById("cameraModal");
const cameraVideo = document.getElementById("cameraVideo");
const takePhoto = document.getElementById("takePhoto");
const closeCamera = document.getElementById("closeCamera");

let stream;

cameraBtn.onclick = async () => {

cameraModal.style.display = "flex";

stream = await navigator.mediaDevices.getUserMedia({
video:true,
audio:false
});

cameraVideo.srcObject = stream;

};

closeCamera.onclick = () => {

cameraModal.style.display = "none";

if(stream){

stream.getTracks().forEach(track=>track.stop());

}

};

takePhoto.onclick = () => {

const canvas = document.createElement("canvas");

canvas.width = cameraVideo.videoWidth;
canvas.height = cameraVideo.videoHeight;

const ctx = canvas.getContext("2d");

ctx.drawImage(cameraVideo,0,0);

const img = canvas.toDataURL("image/png");

sendImage(img);

};

function sendImage(img){

const messages = document.getElementById("messages");

const bubble = document.createElement("div");

bubble.className = "bubble user";

const image = document.createElement("img");

image.src = img;

image.style.maxWidth = "200px";

bubble.appendChild(image);

messages.appendChild(bubble);

messages.scrollTop = messages.scrollHeight;

}