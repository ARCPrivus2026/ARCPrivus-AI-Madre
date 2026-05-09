
markdown
# 📖 ARC Privus Messenger - API REST

Este documento describe los endpoints disponibles en la plataforma ARC Privus Messenger.

---

## 🔑 Autenticación

### Registro de usuario
**POST** `/api/users/register`
```json
{
  "name": "Arnaldo",
  "email": "arnaldo@arcprivus.com",
  "password": "123456"
}
Respuesta:

json
{ "message": "Usuario registrado correctamente" }
Inicio de sesión
POST /api/users/login

json
{
  "email": "arnaldo@arcprivus.com",
  "password": "123456"
}
Respuesta:

json
{
  "message": "Login exitoso",
  "token": "<JWT_TOKEN>"
}
Perfil de usuario
GET /api/users/me
Respuesta:

json
{
  "id": 1,
  "name": "Arnaldo",
  "email": "arnaldo@arcprivus.com"
}
📦 Planes
Listar planes
GET /api/plans
Respuesta:

json
[
  { "id": 1, "name": "Gratis", "price": 0.00, "duration": 30 },
  { "id": 2, "name": "Premium", "price": 9.99, "duration": 30 }
]
Activar plan
POST /api/plans/activate

json
{
  "userId": 1,
  "planId": 2
}
Respuesta:

json
{ "message": "Plan activado para el usuario" }
💬 Mensajes
Enviar mensaje
POST /api/messages

json
{
  "recipientId": 2,
  "content": "Hola Lucía, ¿cómo va todo?"
}
Respuesta:

json
{ "message": "Mensaje enviado correctamente" }
Listar mensajes
GET /api/messages/:chatId
Respuesta:

json
[
  {
    "id": 1,
    "sender_id": 1,
    "recipient_id": 2,
    "content": "Hola Lucía, ¿cómo va todo?",
    "sent_at": "2026-05-05T22:30:00"
  }
]
🌐 Traducción
Traducción de texto
POST /api/translate

json
{
  "text": "Hola, ¿cómo estás?",
  "targetLang": "en"
}
Respuesta:

json
{
  "original": "Hola, ¿cómo estás?",
  "translated": "Hello, how are you?"
}
📂 Multimedia
Subir archivo
POST /api/media/upload
Respuesta:

json
{
  "message": "Archivo subido correctamente",
  "url": "/uploads/1651789200-foto.png"
}