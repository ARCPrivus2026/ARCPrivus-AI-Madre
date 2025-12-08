function iniciarInscripcion() {
    alert("Bienvenido al sistema ARC Privus AI Madre.\n\nLa IA realizará su inscripción de forma automática.\nConfirme si autoriza continuar.");

    const nombre = prompt("Ingrese su nombre:");
    const correo = prompt("Ingrese su correo:");
    
    alert("Procesando su inscripción...");
    
    setTimeout(() => {
        alert("Inscripción completada.\nBienvenido, " + nombre + ".\nLa IA ha registrado sus datos.");
    }, 2000);
}
