require('dotenv').config();
const fs = require('fs');
const express=require("express");

const app=express();
const path=require("path")
const mysql=require("mysql2")
const bcrypt=require("bcrypt")
const jwt = require("jsonwebtoken");
const cookieParser=require("cookie-parser")
const nodemailer = require('nodemailer');
const cron=require("node-cron")
const crypto=require("crypto")
app.set("view engine","ejs")
app.use(express.static(path.join(__dirname, "../public")));
app.use(express.urlencoded({extended:true}))
app.use(express.json());
app.use(cookieParser())
const JWT_SECRET="this is secret"
const JWT_EXPIRES="1h"
const mailer = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

mailer.verify((error, success) => {
    if (error) {
        console.error("SMTP Connection Error:", error);
    } else {
        console.log("SMTP Server is ready to send emails!");
    }
});
// async function sendEmail(to, subject, text) {
//   return mailer.sendMail({
//     from: process.env.FROM_EMAIL,
//     to,
//     subject,
//     text
//   });
// }
async function sendEmail(to, subject, text) {
  try {
    const info = await mailer.sendMail({
      from: process.env.FROM_EMAIL,
      to,
      subject,
      text
    });
    console.log(`Email sent to ${to}: ${info.response}`);
    return info;
  } catch (err) {
    console.error(`Failed to send email to ${to}:`, err);
    throw err; // rethrow to handle in route
  }
}

// cron.schedule("* * * * *",()=>{
//     const sql="select r.* ,u.email as user_email from reminders  r join users u on u.id=r.user_id where r.sent=0 and r.reminder_time<=NOW() "
//      db.query(sql,async(err,rows)=>{
//         if(err){
//             return res.json({
//                 msg:"error fetching data from database"
//             })
//         }
//         for(const r of rows){
//             const msg=r.custom_message||`Reminder: "${r.contest_title}" is starting soon!\n${r.contest_url}`;
//              try{
//                  await sendEmail(r.user_email,"contest reminder",msg)
//                  db.query("update reminders set sent=1,sent_at=NOW() where id=?",[r.id])
//                  console.log(`Reminder ${r.id} sent to ${r.user_email}`);

//              }catch(e){
//                 console.error(`Error sending email for reminder ${r.id}:`, e.message);

               
//              }
       
//         }
//      })

// })
cron.schedule("* * * * *", async () => {
    const sql = "select r.* ,u.email as user_email from reminders r join users u on u.id=r.user_id where r.sent=0 and r.reminder_time <= CONVERT_TZ(NOW(), '+00:00', '+05:30')";
    try {
        const [rows] = await db.query(sql); // Use async/await to get the rows
       
        console.log("Reminders fetched:", rows.length);
        for (const r of rows) {
            const msg = r.custom_message || `Reminder: "${r.contest_title}" is starting soon!\n${r.contest_url}`;
            try {
                await sendEmail(r.user_email, "contest reminder", msg);
                // Use async/await for the update query as well
                await db.query("update reminders set sent=1,sent_at=NOW() where id=?", [r.id]);
                console.log(`Reminder ${r.id} sent to ${r.user_email}`);
            } catch (e) {
                console.error(`Error sending email for reminder ${r.id}:`, e.message);
            }
        }
    } catch (err) {
        console.error("Error fetching data from database:", err);
    }
});



const logos = {
    "codeforces": "https://sta.codeforces.com/s/44350/images/codeforces-logo-with-telegram.png",
    "leetcode": "https://upload.wikimedia.org/wikipedia/commons/1/19/LeetCode_logo_black.png",
    "codechef": "https://cdn.codechef.com/sites/all/themes/abessive/cc-logo.svg",
    "AtCoder": "https://img.atcoder.jp/assets/atcoder.png",
    "HackerRank": "https://upload.wikimedia.org/wikipedia/commons/6/65/HackerRank_logo.png",
    
};
// const db=mysql.createConnection({
//     host:"localhost",
//     user:"root",
//     password:"4nm21cs007",
//     database:"contests_site"
// })
const db = mysql.createPool({
    host: process.env.DB_HOST,
    port: 4071,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: true }
}).promise();


(async () => {
  try {
    const [rows] = await db.query('SHOW TABLES');
    console.log('Tables:', rows);
  } catch (err) {
    console.error('Database connection failed:', err);
  }
})();
// db.connect((err)=>{
//     if(err){
//         console.error(err)
//         return
//     }
//     console.log("Database connected")
// })
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
function generateotp(){
     return Math.floor(100000 + Math.random() * 900000).toString();
}


app.get("/register",(req,res)=>{
    return res.render("register",{user:req.user})
})
app.get("/login",checkAuth,async (req,res)=>{
    return res.render("login.ejs",{user:req.user})
})
// app.post("/login",async(req,res)=>{
    
//     const {email,password}=req.body;
//     const findUser="select *from users where email=?";
//     db.query(findUser,[email],async(err,result)=>{
        
//         if(err){
//             return res.send("error finding data")
//         }
//         const user=result[0]
//         if(result.length===0){
//             return res.send("No user found")
//         }
//         const isCorrect= await bcrypt.compare(password,result[0].password)
//         console.log(isCorrect)
//         if(!isCorrect){
//              return res.redirect("/login")
//         }
//         const token=jwt.sign({id:user.id,email:user.email,isverified:user.is_verified},JWT_SECRET,{expiresIn:JWT_EXPIRES})
//         res.cookie("token", token, {
//         httpOnly: true, // Can't be accessed via JS
//         secure: true,   // Only over HTTPS
//          maxAge: 3600000 // 1 hour
// });
// return res.redirect("/dashboard")

        
//     })

    
// })
app.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        const findUserQuery = "SELECT * FROM users WHERE email = ?";
        const [result] = await db.query(findUserQuery, [email]); 

        if (result.length === 0) {
            return res.send("No user found");
        }

        const user = result[0];
        const isCorrect = await bcrypt.compare(password, user.password);

        if (!isCorrect) {
            return res.redirect("/login");
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, isverified: user.is_verified },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES }
        );

        res.cookie("token", token, {
            httpOnly: true,
            secure: true,
            maxAge: 3600000
        });

        return res.redirect("/dashboard");
    } catch (err) {
        console.error(err);
        return res.status(500).send("Server error");
    }
});
// app.post("/register",async(req,res)=>{
//     console.log(req.body)
//     const {name,email,password}=req.body;
//     const hashedpassword= await bcrypt.hash(password,10);
    
    
//     const registerquery="insert into users(name,email,password)values(?,?,?)"
//     db.query(registerquery,[name,email,hashedpassword],(err,result)=>{
//         if(err){
//             return res.send(err)
//         }
      
//         res.redirect("/")
//     })

// })
app.post("/register", async (req, res) => {
    console.log(req.body);
    const { name, email, password } = req.body;

    try {
        const hashedpassword = await bcrypt.hash(password, 10);
        const registerquery = "insert into users(name,email,password) values(?,?,?)";
        await db.query(registerquery, [name, email, hashedpassword]);
        res.redirect("/");
    } catch (err) {
        console.error("Registration error:", err);
        // You should provide a more helpful error message to the user here
        res.status(500).send("Registration failed. Please try again.");
    }
});
app.post('/logout', (req, res) => {
    res.clearCookie('token', {
        httpOnly: true,
        secure: true,     
        sameSite: 'Strict'
    });
    res.redirect('/login');
});


app.get("/", checkAuth, async (req, res) => {
    try {
        const response = await fetch("https://competeapi.vercel.app/contests/upcoming/");
        const text = await response.text(); // get raw response first
        let contests;

        try {
            contests = JSON.parse(text); // try to parse JSON
        } catch (err) {
            console.error("Failed to parse JSON from API:", text);
            contests = []; // fallback to empty array
        }

        // map contests if available
        contests = (contests || []).map((c) => ({
            ...c,
            logo: logos[c.site],
            user: req.user
        }));

        return res.render("home", { contests, user: req.user });

    } catch (err) {
        console.error("Error fetching contests:", err);
        return res.render("home", { contests: [], user: req.user });
    }
});

// app.post("/setreminder", checkAuth,async(req,res)=>{
//     const {contestUrl,reminderTime,contestTitle,custoMessage}=req.body;
//     console.log(req.user.id)
    
//     console.log(`contest Url:${contestUrl} and remainderTime is ${reminderTime} contestTitle is ${contestTitle}`)
//  const reminderquery="insert into  reminders(user_id,contest_title,contest_url,reminder_time, custom_message) values(?,?,?,?,?)"
//  db.query(reminderquery,[req.user.id,contestTitle,contestUrl,reminderTime,custoMessage],(err,result)=>{
//     if(err){
//         return res.json({msg:"Problem inserting data into database"})
//     }
//     return res.json({
//         msg:"sucessfully inserted into remainder"
//     })

//  })
// })
app.post("/setreminder", checkAuth, async (req, res) => {
    const { contestUrl, reminderTime, contestTitle, custoMessage } = req.body;
    console.log(req.user.id);
    console.log(`contest Url:${contestUrl} and remainderTime is ${reminderTime} contestTitle is ${contestTitle}`);

    try {
        const reminderquery = "insert into reminders(user_id,contest_title,contest_url,reminder_time, custom_message) values(?,?,?,?,?)";
        await db.query(reminderquery, [req.user.id, contestTitle, contestUrl, reminderTime, custoMessage]);
        return res.json({
            msg: "Successfully inserted into remainder"
        });
    } catch (err) {
        console.error("Error setting reminder:", err);
        return res.status(500).json({
            msg: "Problem inserting data into database"
        });
    }
});
// app.get("/dashboard",checkAuth,async(req,res)=>{
//     const queryReminder="select * from reminders where user_id=?"
    
//     db.query(queryReminder,[req.user.id],(err,result)=>{
//         if(err){
//             return res.json({
//                 message:"Error findig contests"
//             })
//         }
//         console.log(result)
//         return res.render("dashboard",{user:req.user,
//             contests:result
//         })
        
//     })
    
// })
app.get("/dashboard", checkAuth, async (req, res) => {
    try {
        const queryReminder = "select * from reminders where user_id=?";
        const [contests] = await db.query(queryReminder, [req.user.id]);

        console.log(contests);
        return res.render("dashboard", {
            user: req.user,
            contests: contests
        });
    } catch (err) {
        console.error("Error finding contests:", err);
        return res.status(500).json({
            message: "Error finding contests"
        });
    }
});
// app.post("/register/otp",checkAuth,async(req,res)=>{
//     const {email}=req.body;
//     console.log(email)
//     const otp=Math.floor(100000 + Math.random() * 900000).toString();
//     console.log(otp)
//       db.query("insert into  email_otps(email,otp,expires_at)values (?,?,?) ",[email,otp,new Date(Date.now() + 10 * 60 * 1000)],async(err,result)=>{
//                if(err){
//                  return res.json({msg:"problem sending otp"})
//                }
//                await sendEmail(email,"Email verification",`your otp is${otp}`)
//                res.render("verifyotp",{user:req.user})
//         })

// })
app.post("/register/otp", checkAuth, async (req, res) => {
    try {
        const { email } = req.body;
        console.log(email);
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        console.log(otp);

        await db.query("insert into email_otps(email,otp,expires_at) values (?,?,?)", [email, otp, new Date(Date.now() + 10 * 60 * 1000)]);
        
        await sendEmail(email, "Email verification", `your otp is${otp}`);
        
        res.render("verifyotp", { user: req.user });

    } catch (err) {
        console.error("Error sending OTP:", err);
        return res.status(500).json({ msg: "Problem sending OTP" });
    }
});
// app.post("/verify/otp", checkAuth, (req, res) => {
//   const { otp } = req.body; 

//   db.query(
//     "SELECT * FROM email_otps WHERE email=? AND otp=? AND expires_at > NOW()",
//     [req.user.email, otp],
//     (err, result) => {
//       if (err) return res.status(500).json({ msg: "Database error" });

//       if (result.length === 0) {
//         return res.status(400).json({ msg: "Invalid or expired OTP" });
//       }

   
//       db.query(
//         "UPDATE users SET is_verified = 1 WHERE email = ?",
//         [req.user.email],
//         (err2, result2) => {
//           if (err2) return res.status(500).json({ msg: "Failed to verify user" });

          
//           db.query("DELETE FROM email_otps WHERE email = ?", [req.user.email], (err3) => {
//             if (err3) console.log("Failed to delete OTP:", err3);
           
//             return res.json({ msg: "Email verified successfully!" });
//           });
//         }
//       );
//     }
//   );
// });

app.post("/verify/otp", checkAuth, async (req, res) => {
    const { otp } = req.body;

    try {
     
        const [result] = await db.query(
            "SELECT * FROM email_otps WHERE email=? AND otp=? AND expires_at > NOW()",
            [req.user.email, otp]
        );

        if (result.length === 0) {
            return res.status(400).json({ msg: "Invalid or expired OTP" });
        }

        
        await db.query(
            "UPDATE users SET is_verified = 1 WHERE email = ?",
            [req.user.email]
        );

     
        await db.query("DELETE FROM email_otps WHERE email = ?", [req.user.email]);
        
        return res.redirect("/dashboard");

    } catch (err) {
        console.error("OTP verification error:", err);
        return res.status(500).json({ msg: "Database error" });
    }
});
app.listen(3000,(req,res)=>{
    console.log("site is live at 3000")
})
