import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { Video } from "../models/video.model";
import { uploadOnCloudinary } from "../utils/cloudinary";

const getAllVideos=asyncHandler(async(req,res)=>{
    const {page=1,limit=10,query,sortBy,sortType,userId}=req.query
    
    if(!userId) throw new ApiError(400,"userId is required")

    const videos=await Video.find({owner:userId})
     .skip(skip)
     .limit(limit)
     .sort({createdAt:-1})
    return res.status(200)
    .json(new ApiResponse(200,videos,"All videos fetched successfully"))
})

const publishAVideo=asyncHandler(async(req,res)=>{
    const {name,description}=req.body

    if(!name || !description) throw new ApiError(400,"Both title and description required to upload the video")

    const videoLocalPath=await req.files?.videoFile[0]?.path
    if(!videoLocalPath) throw new ApiError(400,"video file is required")
 
    const thumbnailLocalPath=await req.files?.thumbnail[0]?.path 
    if(!thumbnailLocalPath) throw new ApiError(400,"thumbnail is required")

    try{
    const videoFile=await uploadOnCloudinary(videoLocalPath)
    const thumbnail=await uploadOnCloudinary(thumbnailLocalPath)
    if(!videoFile) throw new ApiError(400,"video file is required")

    if(!thumbnail) throw new ApiError(400,"thumbnail is required")

    const video=await Video.create({
        name,
        description,
        videoFile:videoFile.url,
        thumbnail:thumbnail.url,
        owner:req.user?._id
    })

    return res.status(200)
    .json(new ApiResponse(200,video,"video published successfully"))
}
    catch(error){
        console.log("Error while publishing the video ",error )
        throw new ApiError(500,"Failed to upload")
    }
})

const getVideoById=asyncHandler(async(req,res)=>{
    const {videoId}=req.params
    if(!videoId) throw new ApiError(400,"videoId is required")

    const video=await Video.findById(videoId)

    if(!video) throw new ApiError(400,"video does not exist")

    return res.status(200)
    .json(new ApiResponse(200,video,"video fetched successfully"))

})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { title, description } = req.body;
    const thumbnailLocalPath = req.file?.thumbnail[0]?.path;

    if (!title && !description && !thumbnailLocalPath) {
        throw new ApiError(400, "At least one of title, description, or thumbnail is required to update the video");
    }

    let thumbnail;
    if (thumbnailLocalPath) {
        thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
        if (!thumbnail) {
            throw new ApiError(400, "Failed to upload thumbnail to Cloudinary");
        }
    }

    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    if (title) {
        video.title = title;
    }
    if (description) {
        video.description = description;
    }
    if (thumbnail) {
        video.thumbnail = thumbnail.url; 
    }

    await video.save(); 

    return res.status(200)
        .json(new ApiResponse(200, video, "Video updated successfully"));
});

const deleteVideo=asyncHandler(async (req,res)=>{
    const {videoId}=req.params

    if(!videoId) throw new ApiError(400,"videoId is required")

    const video=await Video.findById(videoId)

    if(!video) throw new ApiError(404,"video with this id does not exist")
    await video.remove()

    return res.status(200)
    .json(new ApiResponse(200,"Video deleted successfully"))
})

export {getAllVideos,publishAVideo,getVideoById,updateVideo,deleteVideo}