const ARC={

async register(name,email,assistant){

await fetch("/api/register",{

method:"POST",
headers:{ "Content-Type":"application/json" },

body:JSON.stringify({

name,
email,
assistantName:assistant

})

});

localStorage.setItem("user",name);

}
class ARCPrivusCore {

constructor(){

this.users = {};
this.messages = 0;
this.bots = 0;

}

registerUser(name){

if(!this.users[name]){

this.users[name] = {
name:name,
created:Date.now(),
messages:0
};

}

}

recordMessage(name){

this.messages++;

if(this.users[name]){

this.users[name].messages++;

}

}

getStats(){

return {

users:Object.keys(this.users).length,
messages:this.messages,
bots:this.bots

};

}

}

const ARC_CORE = new ARCPrivusCore();

module.exports = ARC_CORE;

};