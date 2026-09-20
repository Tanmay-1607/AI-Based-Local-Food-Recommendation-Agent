import React, { useState } from 'react';
import { Star, MapPin, ThumbsUp, ThumbsDown, Info, Flame, Check } from 'lucide-react';

export default function FoodCard({ item, onSelectDetails, onFeedback, isLiked = false, isDisliked = false }) {
  const [feedbackGiven, setFeedbackGiven] = useState(null);

  const handleLike = () => {
    setFeedbackGiven('like');
    onFeedback(item, 'like');
  };

  const handleDislike = () => {
    setFeedbackGiven('dislike');
    onFeedback(item, 'dislike');
  };

  const isVeg = item.food_type === 'veg';
  const isEgg = item.food_type === 'egg';

  // Badge colors based on match score
  const scoreColor = item.match_score >= 80 
    ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
    : item.match_score >= 65 
    ? 'bg-amber-100 text-amber-800 border-amber-300' 
    : 'bg-stone-100 text-stone-700 border-stone-300';

  return (
    <div className="bg-white rounded-3xl p-5 border border-cream-300 shadow-card hover:shadow-pop hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between group">
      
      {/* Top Header: Dietary Tag + Match Score */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          
          {/* Dietary Indicator */}
          <div className="flex items-center space-x-2">
            <span className={`w-4 h-4 rounded border flex items-center justify-center p-0.5 ${
              isVeg 
                ? 'border-emerald-600' 
                : isEgg 
                ? 'border-amber-600' 
                : 'border-rose-600'
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                isVeg 
                  ? 'bg-emerald-600' 
                  : isEgg 
                  ? 'bg-amber-600' 
                  : 'bg-rose-600'
              }`} />
            </span>
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
              {item.cuisine}
            </span>
          </div>

          {/* AI Match Score Badge */}
          {item.match_score !== undefined && (
            <div className={`px-2.5 py-1 rounded-full text-xs font-black border flex items-center space-x-1 ${scoreColor}`}>
              <span>{Math.round(item.match_score)}% Match</span>
            </div>
          )}
        </div>

        {/* Dish Title */}
        <h3 className="text-lg font-black text-forest-950 group-hover:text-spice-600 transition-colors line-clamp-1">
          {item.dish_name}
        </h3>

        {/* Restaurant and Locality */}
        <div className="flex items-center space-x-1.5 text-xs text-stone-600 font-semibold mt-1">
          <span className="text-stone-900 font-bold">{item.restaurant_name}</span>
          <span>•</span>
          <span className="flex items-center text-stone-500">
            <MapPin className="w-3 h-3 mr-0.5 text-forest-700" />
            {item.locality}
          </span>
        </div>

        {/* Price and Rating Bar */}
        <div className="flex items-center justify-between mt-3 py-2 px-3 rounded-xl bg-cream-100/80 border border-cream-200">
          <div className="text-sm font-black text-forest-900">
            ₹{Math.round(item.price)}
          </div>
          <div className="flex items-center space-x-3 text-xs">
            {/* Spice indicator */}
            <div className="flex items-center text-spice-600 font-bold" title={`Spice Level: ${item.spice_level}/5`}>
              <Flame className="w-3.5 h-3.5 mr-0.5 fill-spice-500" />
              <span>{item.spice_level}/5</span>
            </div>
            {/* Rating */}
            <div className="flex items-center text-amber-600 font-black">
              <Star className="w-3.5 h-3.5 mr-0.5 fill-amber-400 text-amber-500" />
              <span>{item.rating}</span>
            </div>
          </div>
        </div>

        {/* AI "Why Recommended" Explanation Badge */}
        {item.why_recommended && (
          <div className="mt-3.5 p-2.5 rounded-xl bg-forest-50 border border-forest-200/80 text-xs text-forest-900">
            <div className="font-extrabold text-[10px] uppercase tracking-wider text-forest-700 mb-0.5 flex items-center space-x-1">
              <span>Why Recommended:</span>
            </div>
            <p className="font-medium text-stone-700 leading-snug line-clamp-2">
              {item.why_recommended}
            </p>
          </div>
        )}

        {/* Short Description */}
        <p className="mt-2 text-xs text-stone-500 line-clamp-2 leading-relaxed">
          {item.description}
        </p>
      </div>

      {/* Card Actions: Like/Dislike feedback + Details button */}
      <div className="mt-4 pt-3 border-t border-cream-200 flex items-center justify-between">
        
        {/* Feedback Buttons */}
        <div className="flex items-center space-x-1">
          <button
            type="button"
            onClick={handleLike}
            title="Like this recommendation (tunes future results)"
            className={`p-2 rounded-lg text-xs font-bold transition-all ${
              feedbackGiven === 'like' || isLiked
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-stone-500 hover:text-emerald-700 hover:bg-emerald-50'
            }`}
          >
            <ThumbsUp className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleDislike}
            title="Dislike this recommendation"
            className={`p-2 rounded-lg text-xs font-bold transition-all ${
              feedbackGiven === 'dislike' || isDisliked
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-stone-500 hover:text-rose-700 hover:bg-rose-50'
            }`}
          >
            <ThumbsDown className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* View Details Button */}
        <button
          type="button"
          onClick={() => onSelectDetails(item)}
          className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-bold text-forest-900 hover:bg-forest-100 border border-forest-200 transition-colors"
        >
          <Info className="w-3.5 h-3.5 opacity-70" />
          <span>View Details</span>
        </button>

      </div>

    </div>
  );
}
