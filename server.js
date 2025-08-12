const express=require("express");
const extended = require("it/lib/extended");
const app=express();
const path=require("path")
const mysql=require("mysql2")
const bcrypt=require("bcrypt")
const jwt = require("jsonwebtoken");
const cookieParser=require("cookie-parser")
app.set("view engine","ejs")
app.use(express.static(path.join(__dirname, "../public")));
app.use(express.urlencoded({extended:true}))
app.use(express.json());
app.use(cookieParser())
const JWT_SECRET="this is secret"
const JWT_EXPIRES="1h"
const logos = {
    "codeforces": "https://sta.codeforces.com/s/44350/images/codeforces-logo-with-telegram.png",
    "leetcode": "https://upload.wikimedia.org/wikipedia/commons/1/19/LeetCode_logo_black.png",
    "codechef": "https://cdn.codechef.com/sites/all/themes/abessive/cc-logo.svg",
    "AtCoder": "https://img.atcoder.jp/assets/atcoder.png",
    "HackerRank": "https://upload.wikimedia.org/wikipedia/commons/6/65/HackerRank_logo.png",
    
};
const db=mysql.createConnection({
    host:"localhost",
    user:"root",
    password:"4nm21cs007",
    database:"contests_site"
})
db.connect((err)=>{
    if(err){
        console.error(err)
        return
    }
    console.log("Database connected")
})
function checkAuth(req, res, next) {
  const token = req.cookies.token;
  if (!token) {
    req.user = null;
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      req.user = null;
    } else {
      req.user = user; 
    }
    next();
  });
}


app.get("/register",(req,res)=>{
    return res.render("register")
})
app.get("/login",async (req,res)=>{
    return res.render("login.ejs")
})
app.post("/login",async(req,res)=>{
    
    const {email,password}=req.body;
    const findUser="select *from users where email=?";
    db.query(findUser,[email],async(err,result)=>{
        
        if(err){
            return res.send("error finding data")
        }
        const user=result[0]
        if(result.length===0){
            return res.send("No user found")
        }
        const isCorrect= await bcrypt.compare(password,result[0].password)
        console.log(isCorrect)
        if(!isCorrect){
             return res.redirect("/login")
        }
        const token=jwt.sign({id:user.id,email:user.email},JWT_SECRET,{expiresIn:JWT_EXPIRES})
        res.cookie("token", token, {
        httpOnly: true, // Can't be accessed via JS
        secure: true,   // Only over HTTPS
         maxAge: 3600000 // 1 hour
});
res.json({ message: "Login successful" });

        
    })

    
})
app.post("/register",async(req,res)=>{
    console.log(req.body)
    const {name,email,password}=req.body;
    const hashedpassword= await bcrypt.hash(password,10);
    
    const registerquery="insert into users(name,email,password)values(?,?,?)"
    db.query(registerquery,[name,email,hashedpassword],(err,result)=>{
        if(err){
            return res.send(err)
        }
        res.send("user Registered Sucessfully")
    })

})

app.get("/",checkAuth,async(req,res)=>{
    const response=await fetch("https://competeapi.vercel.app/contests/upcoming/");
    let contests=await response.json()
    contests=contests.map((c)=>{
        return{ ...c,
        logo:logos[c.site],
        user:req.user
    }
        
    })
    // console.log(response)
    
    
    return res.render("home",{contests})
})

app.listen(3000,(req,res)=>{
    console.log("site is live at 3000")
})
