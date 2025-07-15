if(process.env.NODE_ENV != "production"){
    require('dotenv').config();
}


const express = require('express');
const app = express();
const mongoose = require('mongoose');
const path = require('path');
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const ExpressError = require("./utils/ExpressError.js")
const session = require("express-session");
const MongoStore = require('connect-mongo');
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user.js");


const listingRouter = require("./routes/listing.js")
const reviewRouter = require("./routes/review.js")
const userRouter = require("./routes/user.js");

app.use(methodOverride("_method"));
app.use(express.urlencoded({extended : true}));
app.set("views",path.join(__dirname,"views"));
app.set("view engine","ejs");
app.use(express.static(path.join(__dirname,"/public")));
app.engine("ejs",ejsMate);

const dbUrl = process.env.ATLASDB_URL;

main().then(() =>{
    console.log("connection successful")
}).
catch(err => console.log(err));

async function main() {
  await mongoose.connect(dbUrl);

  // use `await mongoose.connect('mongodb://user:password@127.0.0.1:27017/test');` if your database has auth enabled
}

// app.get("/",(req,res)=>{
//     res.send("Hi, I am root");
// });

const store = MongoStore.create({
    mongoUrl : dbUrl,
    crypto : {
        secret : process.env.SECRET,
    },
    touchAfter: 24 * 3600,
});

store.on("error",()=>{
    console.log("Error in MONGO SESSION STORE", err)
});

const sessionOptions ={
    store,
    secret : process.env.SECRET,
    resave: false,
    saveUninitialized : true,
    cookie :{
        expires : Date.now() + 7* 24* 60* 60* 1000,
        maxAge :  7* 24* 60* 60* 1000,
        httpOnly : true,
    },
};

app.use(session(sessionOptions));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req,res,next)=>{
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.currUser = req.user;
    next();
});

// app.get("/demoUser",async(req,res)=>{
//     let fakeUser = new User({
//         email:"student@gmail.com",
//         username: "Shivani"
//     });
//     let registeredUser = await User.register(fakeUser,"Helloworld");
//     res.send(registeredUser);
// });

app.use("/listings",listingRouter);
app.use("/listings/:id/reviews",reviewRouter)
app.use("/",userRouter);

// app.all("/*",(req,res,next)=>{
//     console.log(req.originalUrl);
//     next(new ExpressError(404,"Page Not Found!"));
// });

app.use((req, res, next) => {
    console.log("404 - Not Found:", req.originalUrl);
    next(new ExpressError(404, "Page Not Found!"));
});

app.use((err,req,res,next)=>{
    let {statusCode=500,message="Something went wrong"}=err;
    // res.status(statusCode).send(message);
    res.status(statusCode).render("error.ejs",{err})
});

app.listen(8080,()=>{
    console.log("server is listening on port number 8080");
});