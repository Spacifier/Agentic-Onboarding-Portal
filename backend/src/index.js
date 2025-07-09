import dotenv from "dotenv"
dotenv.config()
import connectDB from "./db/index.js";
import { app } from "./app.js";

const PORT = process.env.PORT;

connectDB()
.then(() => {
    app.on("error", (error) => {
        //Listening for errors
        console.log("Error in listening: ",error);
        throw error
    })
    app.listen(PORT || 7000,() => {
        console.log(`Server is running at port: ${PORT}`);
    })
})
.catch((err) => {
    console.log("MongoDB connection failed: ",err);
})