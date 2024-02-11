import {asyncHandler} from '../utils/asyncHandler.js'
import {ApiError} from '../utils/ApiError.js'
import {User} from '../models/user.model.js'
import {uploadOnCloudinary} from '../utils/cloudinary.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import jwt from 'jsonwebtoken'
import cloudinary from 'cloudinary'
import mongoose from 'mongoose'

const generateAccessAndRefereshTokens = async(userId) =>{
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return {accessToken, refreshToken}


    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating referesh and access token")
    }
}

const registerUser=asyncHandler(async(req,res)=>{

    const {email,fullName,username,password}=await req.body;
    // console.log("req.body ",req.body);
    if(
        [email,username,fullName,password].some((field)=>
        field?.trim===""
        )
    ){
        throw new ApiError(400,"All fields are required")
    }

    //check if user already exists
    const existedUser=await User.findOne(
        {
            $or:[{ username },{ email }]
        }
    )
    if(existedUser) throw new ApiError(409,'User with this email or username already exists')
    
    // console.log("\n req.files ",req.files);
    const avatarLocalPath=await req.files?.avatar[0]?.path;
    // const coverImageLocalPath=await req.files?.coverImage[0]?.path;
    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage && req.files.coverImage.length) ){
        coverImageLocalPath=req.files.coverImage[0].path;
    }

    if(!avatarLocalPath) throw new ApiError(400,'Avatar is required ');

    const avatar=await uploadOnCloudinary(avatarLocalPath)
    const coverImage=await uploadOnCloudinary(coverImageLocalPath)
    if(!avatar) throw new ApiError(400,'Avatar is required ');

    const user=await User.create({
        fullName,
        avatar:avatar.url,
        coverImage:coverImage?.url || "",
        email,
        password,
        username:username.toLowerCase()
    })

    // we don't want to show the password and the refreshToken
    const createdUser=await User.findById(user._id).select(
        "-password -refreshToken"
    )
    if(!createdUser) throw new ApiError(500,"Something went wrong while registering ")

   return res.status(201).json(
        new ApiResponse(200,createdUser,'User registered successfully')
    )
})

const loginUser = asyncHandler(async (req, res) =>{
    // req body -> data
    // username or email
    //find the user
    //password check
    //access and referesh token
    //send cookie

    const {email, username, password} = req.body
    // console.log(email);

    if (!username && !email) {
        throw new ApiError(400, "username or email is required")
    }
    
    // Here is an alternative of above code based on logic discussed in video:
    // if (!(username || email)) {
    //     throw new ApiError(400, "username or email is required")
        
    // }

    const user = await User.findOne({
        $or: [{username}, {email}]
    })

    if (!user) {
        throw new ApiError(404, "User does not exist")
    }

   const isPasswordValid = await user.isPasswordCorrect(password)

   if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials")
    }

   const {accessToken, refreshToken} = await generateAccessAndRefereshTokens(user._id)

//    console.log(accessToken)
//    console.log(refreshToken)
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200, 
            {
                user: loggedInUser, accessToken, refreshToken
            },
            "User logged In Successfully"
        )
    )

})

const logoutUser=asyncHandler(async(req,res)=>{
      await User.findByIdAndUpdate(req.user._id,
        {
            $unset:{
                refreshToken:1
            }
        } ,
        {
            new:true
        }
        )

        const options={
            httpOnly:true,
            secure:true
        }

        return res.status(200)
        .clearCookie("accessToken",options)
        .clearCookie("refreshToken",options)
        .json(new ApiResponse(200,{},"User Logged Out"))
})

const refreshAccessToken=asyncHandler(async (req,res)=>{
    const incomingRefreshToken=req.cookie?.refreshToken || req.body.refreshToken;
    if(!incomingRefreshToken) throw new ApiError(401,'unauthorized access')

    try{
        const decodedToken=jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET);

        const user=await User.findById(decodedToken?._id)
        if(!user) throw new ApiError(401,'invalid refresh token')

        if(incomingRefreshToken!==user.refreshToken) throw new ApiError( 401,"Refresh token is expired or used")

        const options={
            httpOnly:true,
            secure:true
        }

        const {refreshToken,accessToken}=await generateAccessAndRefereshTokens(user?._id)
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(
                200, 
                {accessToken, refreshToken: newRefreshToken},
                "Access token refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }
    
})

const changeCurrentPassword=asyncHandler(async (req,res)=>{
    const {oldPassword,newPassword}=req.body

    const user=await User.findById(req.user?._id);
    const isPasswordCorrect=await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect) throw new ApiError(401,'Invalid password')

    user.password=newPassword;
    await user.save({validateBeforeSave:false})

    return res.status(200)
    .json(new ApiResponse(200,{},"Password updated"))
})

const getCurrentUser=asyncHandler(async (req,res)=>{
    return res.status(200)
    .json(new ApiResponse(200,req.user,"Current user fetched"))
})

const updateAccountDetails=asyncHandler(async (req,res)=>{
    const {fullName,email}=req.body

    if(!fullName && !email) throw new ApiError(401,'All files are required')

    const user=User.findByIdAndUpdate(req.user?._id,
        {
            $set:{
                fullName,
                email
            }
        } ,
        {
            new:true
        }
        )
        .select("-password")

        return res.status(200)
        .json(new ApiResponse(200,user,'User details updated successfully'))
})


const updateUserAvatar=asyncHandler(async (req,res)=>{
    // const user=await User.findById(req.user?._id);
    // if(!user) throw new ApiError(401,'User not found')
    // const oldAvatar=user.avatar_public_id;

    // delete the old avatar
    // await cloudinary.Uploader.destroy(oldAvatar,async(err)=>
    // {if(err) return res.status(500).send(err.message)}
    // )

    const avatarLocalPath=req.file?.path

    if(!avatarLocalPath) throw new ApiError(401,'File is missing')

    const avatar=await uploadOnCloudinary(avatarLocalPath)

    if(!avatar.url) throw new ApiError(401,'Error while uploading avatar')

    const user=await User.findByIdAndUpdate(req.user?._id,
        {
           $set:{
            avatar:avatar.url
           }
        },
        {
          new:true
        })
        .select("-password")

        return res.status(200)
        .json(new ApiResponse(200,user,'Avatar updated successfully'))
})

const updateUserCoverImage=asyncHandler(async (req,res)=>{
    const coverImageLocalPath=req.file?.path

    if(!coverImageLocalPath) throw new ApiError(401,'File is missing')

    const coverImage=await uploadOnCloudinary(coverImageLocalPath)

    if(!coverImage.url) throw new ApiError(401,'Error while uploading coverImage')

    const user=await User.findByIdAndUpdate(req.user?._id,
        {
           $set:{
            coverImage:coverImage.url
           }
        },
        {
          new:true
        })
        .select("-password")

        return res.status(200)
        .json(new ApiResponse(200,user,'Cover Image updated successfully'))
})

const getUserChannelProfile=asyncHandler(async(req,res)=>{
    const {username}=req.params;

    if(!username?.trim()) throw new ApiError(400,'user is missing')

    const channel=await User.aggregate([
        {
            $match:{
                username:username?.toLowerCase()
            }
        },
        {
            $lookup:{
                from :"subscriptions",
                localField:"_id",   
                foreignField:"channel",
                as:"subscribers"
            }
        },
        {
            $lookup:{
                from :"subscriptions",
                localField:"_id",
                foreignField:"subscriber",
                as:"subscribedTo"
            }
        },
        {
            $addFields:{
               subscribersCount:{
                $size:"$subscribers"
               },
               channelsSubscribedTo:{
                $size:"$subscribedTo"
               },
               isSubscribed:{
                $cond:{
                if:{$in:[req.user?._id,"$subscribers.subscriber"]},
                then:true,
                else :false
               }
            }
        }
        },
        {
            $project:{
                fullName:1,
                username:1,
                avatar:1,
                subscribersCount:1,
                isSubscribed:1,
                channelsSubscribedTo:1,
                coverImage:1
            }
        }
    ])

    if(!channel?.length) throw new ApiError(400,'Channel with this name does not exist')

    return res.status(200)
    .json(new ApiResponse(200,channel[0],"user channel fetched successfully"))
})


const getWatchHistory = asyncHandler(async(req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields:{
                            owner:{
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user[0].watchHistory,
            "Watch history fetched successfully"
        )
    )
})


export {
    registerUser
    ,loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
}