import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express()

//app.use is used for setting middlewares
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

app.use(express.json({limit: "16kb"}))
app.use(express.urlencoded({extended: true, limit: "16kb"}))
app.use(express.static("public"))
app.use(cookieParser())

//routes import
import userRouter from "./routes/user.route.js";
import applicatioRouter from "./routes/application.route.js";
import chatRouter from "./routes/chat.route.js";

//routes declaration
app.use("/api/v1/users",userRouter);
app.use("/api/v1/application", applicatioRouter);
app.use("/api/v1/chat", chatRouter);


export {app}