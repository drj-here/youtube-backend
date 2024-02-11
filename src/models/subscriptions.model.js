import mongoose from "mongoose";

const subscriptionSchema=new mongoose.Schema({
    channel:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User'
    },
    subscribers:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User"
    }
},
{
    timeseries:true
}
)

export const Subscription=mongoose.model('Subscription',subscriptionSchema)