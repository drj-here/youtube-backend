import  express  from "express";
import cookieParser from "cookie-parser";
import cors from 'cors'
const app=express()

app.use(cors({
    origin:process.env.CORS_ORIGIN,
    credentials:true
}))

app.use(express.json({limit:"20kb"}))
app.use(express.urlencoded({extended:true,limit:"20kb"}))
app.use(express.static("public"))
app.use(cookieParser())
// import routes
import userRouter from './routes/user.route.js'

//route declaration
// this will redirect the user to the route as mentioned
app.use('/api/v1/users',userRouter)
// professionally this is understood and written as https://localhost:5000/api/v1/users

export {app}