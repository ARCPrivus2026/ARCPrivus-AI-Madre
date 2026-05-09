const https = require("https");
const absorptionEngine = require("./ai_absorption_engine");

function fetchPage(url){

return new Promise((resolve,reject)=>{

https.get(url,(res)=>{

let data="";

res.on("data",chunk=>data+=chunk);

res.on("end",()=>resolve(data));

}).on("error",reject);

});

}

function cleanText(html){

return html
.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi,"")
.replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi,"")
.replace(/<[^>]+>/g," ")
.replace(/\s+/g," ")
.trim();

}

function extractAIContent(text){

const keywords = [
"ai","intelligence","machine learning",
"neural","model","algorithm","automation",
"deep learning","llm","gpt"
];

return text
.split(".")
.filter(line =>
keywords.some(k=>line.toLowerCase().includes(k))
)
.slice(0,20)
.join(". ");

}

async function scanURL(url){

try{

const html = await fetchPage(url);

const clean = cleanText(html);

const aiContent = extractAIContent(clean);

if(aiContent){

absorptionEngine.absorbKnowledge(url,aiContent);

console.log("AI Madre aprendió de:",url);

}

}catch(error){

console.log("Error escaneando:",url,error);

}

}

async function runScanner(){

const sources = [

"https://openai.com",
"https://deepmind.google",
"https://huggingface.co",
"https://arxiv.org",
"https://github.com"

];

for(const url of sources){

await scanURL(url);

}

}

module.exports = {
runScanner
};