const express = require("express");
const router = express.Router();
const db = require("../database/db");


// =========================
// REGISTRO
// =========================

router.post("/register", (req,res)=>{

 const {name,email,password} = req.body;

 if(!name || !email || !password){
   return res.json({
     ok:false,
     message:"Datos incompletos"
   });
 }

 db.run(
  "INSERT INTO users (name,email,password) VALUES (?,?,?)",
  [name,email,password],
  function(err){

    if(err){
      return res.json({
        ok:false,
        message:"Usuario ya existe"
      });
    }

    res.json({
      ok:true,
      message:"Usuario creado"
    });

  }
 );

});


// =========================
// LOGIN
// =========================

router.post("/login",(req,res)=>{

 const {email,password} = req.body;

 db.get(
  "SELECT * FROM users WHERE email=? AND password=?",
  [email,password],
  (err,row)=>{

   if(!row){
     return res.json({
       ok:false,
       message:"Credenciales incorrectas"
     });
   }

   res.json({
     ok:true,
     user:row
   });

  }
 );

});

module.exports = router;