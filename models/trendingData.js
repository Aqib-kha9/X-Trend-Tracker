import mongoose from "mongoose";
const trendSchema = new mongoose.Schema({
  category: String,
  trendName: String,
  postsCount: String,
});
const trendingSchema = new mongoose.Schema({
  id:{type:String,required:true},
  trends: [trendSchema],
  ip: { type: String, required: true },
});

const Trending = mongoose.model("Trending", trendingSchema);
export default Trending;
