async function translate(text, target = "en") {

try {

const url =
"https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=" +
target +
"&dt=t&q=" +
encodeURIComponent(text);

const response = await fetch(url);

const data = await response.json();

if (data && data[0] && data[0][0]) {
return data[0][0][0];
}

return text;

} catch (error) {

console.log("Error en traducción:", error);

return text;

}

}

module.exports = { translate };