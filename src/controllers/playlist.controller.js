import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import {  Playlist } from "../models/playlist.model";
import {Video} from "../models/video.model.js"

const createPlaylist=asyncHandler(async(req,res)=>{
    const {name,description}=req.body;
    
    if(!name || !description) throw new ApiError(400,"Name and description required")

    const playlist=await Playlist.create({
        name,
        description
    })
    
    return res.status(200)
    .json(new ApiResponse(200,playlist,"Playlist created"))
})

const getUserPlaylists=asyncHandler(async(req,res)=>{
    //TO-DO
})

const getPlaylistById=asyncHandler(async (req,res)=>{
    const {playlistId}=req.params

    if(!playlistId) throw new ApiError(400,"playlist id is required")

    const playlist=await Playlist.findById(playlistId)

    if(!playlist) throw new ApiError(400,"No playlist exists with this id")

    return res.status(200)
    .json(new ApiResponse(200,playlist,"Playlist fetched successfully"))

})

const addVideoToPlaylist=asyncHandler(async (req,res)=>{
    const {videoId,playlistId}=req.params

    if(!videoId || !playlistId) throw new ApiError(401,"Both video and playlist ids required")

    const video=await Video.findById(videoId) 
    const playlist=await Playlist.findById(playlistId)

    if(!video) throw new ApiError(400,"Video does not exist")
    if(!playlist) throw new ApiError(400,"Playlist does not exist")

    playlist.videos.push(videoId)
    await playlist.save()

    return res.status(200)
    .json(new ApiResponse(200,"Video added to the playlist successfully"))
})

const removeVideoFromPlaylist=asyncHandler(async (req,res)=>{
    const {videoId,playlistId}=req.params

    if(!videoId || !playlistId) throw new ApiError(400,"Both video and playlist ids required")
    
    const video=await Video.findById(videoId) 
    const playlist=await Playlist.findById(playlistId)

    if(!video) throw new ApiError(400,"Video does not exist")
    if(!playlist) throw new ApiError(400,"Playlist does not exist")

    playlist.videos=playlist.videos.filter(id=>id.toString()!==videoId)
    await playlist.save()
    
    return res.status(200)
    .json(new ApiResponse(200,playlist,"Video removed from the playlist successfully"))

})

const deletePlaylist=asyncHandler(async (req,res)=>{
    const {playlistId}=req.params

    if(!playlistId) throw new ApiError(400,"PlaylistId is required")

    const playlist=await Playlist.findById(playlistId)

    if(!playlist) throw new ApiError(400,"Playlist does not exist")

    await playlist.remove()

    return res.status(200)
    .json(new ApiResponse(200,"Playlist deleted successfully"))
})

const updatePlaylist=asyncHandler(async (req,res)=>{
    const {playlistId}=req.params
    const {name,description}=req.body

    if(!playlistId) throw new ApiError(400,"playlistId required")
    if(!name || !description) throw new ApiError(400,"Both fields is required")

    const playlist=await Playlist.findByIdAndUpdate(playlistId,
        {
            $set:{
                name:name,
                description:description
            }
        },
        {
            new:true 
        }
        )

        return res.status(200)
        .json(new ApiResponse(200,playlist,"Playlist updated successfully"))
})

export {createPlaylist,getUserPlaylists,addVideoToPlaylist,removeVideoFromPlaylist,deletePlaylist,updatePlaylist}