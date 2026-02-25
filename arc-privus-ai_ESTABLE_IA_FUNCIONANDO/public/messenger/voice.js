export function speak(text, lang = "es-ES") {
  return new Promise((resolve, reject) => {
    if (!window.speechSynthesis) {
      reject(new Error("TTS no soportado"));
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onend = () => resolve();
    utterance.onerror = (e) => reject(e);

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  });
}

export function stopSpeak() {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

export function createRecognizer({ lang = "es-ES", onStart, onEnd, onText }) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) return null;

  const recognition = new SpeechRecognition();
  recognition.lang = lang;
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onstart = () => onStart && onStart();
  recognition.onend = () => onEnd && onEnd();
  recognition.onresult = (event) => {
    const text = event.results[0][0].transcript;
    if (onText) onText(text);
  };

  recognition.onerror = () => onEnd && onEnd();

  return recognition;
}