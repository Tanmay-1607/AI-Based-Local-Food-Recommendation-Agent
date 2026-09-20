import React, { useState } from 'react';
import { X, Star, MapPin, IndianRupee, Flame, CheckCircle2, ThumbsUp, ThumbsDown, ShieldAlert } from 'lucide-react';

export default function FoodDetailsModal({ item, onClose, onFeedback }) {
  const [ratingVal, setRatingVal] = useState(5);
  const [commentText, setCommentText] = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (!item) return null;

  const handleRatingSubmit = (e) => {
    e.preventDefault();
    onFeedback(item, 'rating', ratingVal, commentText);
    setSubmitted(true);
  };

  const isVeg = item.food_type === 'veg';
  const isEgg = item.food_type === 'egg';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-cream-300 relative animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header Bar */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-md px-6 py-4 border-b border-cream-200 flex items-center justify-between z-10">
          <div className="flex items-center space-x-2">
            <span className={`w-4 h-4 rounded border flex items-center justify-center p-0.5 ${
              isVeg ? 'border-emerald-600' : isEgg ? 'border-amber-600' : 'border-rose-600'
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                isVeg ? 'bg-emerald-600' : isEgg ? 'bg-amber-600' : 'bg-rose-600'
              }`} />
            </span>
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
              {item.cuisine} • {item.locality}, Nagpur
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-stone-400 hover:text-stone-700 hover:bg-cream-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          
          {/* Main Title & Price */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-2xl font-black text-forest-950">
                {item.dish_name}
              </h2>
              <p className="text-sm font-bold text-stone-600 flex items-center mt-1">
                <MapPin className="w-4 h-4 mr-1 text-forest-700" />
                {item.restaurant_name} ({item.locality}, Nagpur)
              </p>
            </div>
            <div className="text-right sm:self-start">
              <div className="text-2xl font-black text-forest-900">
                ₹{Math.round(item.price)}
              </div>
              <span className="text-xs text-stone-400 font-medium">approx per person</span>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-cream-100/90 border border-cream-200 text-center">
            <div>
              <div className="text-xs text-stone-500 font-bold uppercase tracking-wider">Rating</div>
              <div className="text-lg font-black text-amber-600 flex items-center justify-center mt-0.5">
                <Star className="w-4 h-4 mr-1 fill-amber-400 text-amber-500" />
                <span>{item.rating}</span>
                <span className="text-xs text-stone-400 font-normal ml-0.5">/5</span>
              </div>
            </div>
            <div>
              <div className="text-xs text-stone-500 font-bold uppercase tracking-wider">Spice Level</div>
              <div className="text-lg font-black text-spice-600 flex items-center justify-center mt-0.5">
                <Flame className="w-4 h-4 mr-0.5 fill-spice-500" />
                <span>{item.spice_level}/5</span>
              </div>
            </div>
            <div>
              <div className="text-xs text-stone-500 font-bold uppercase tracking-wider">AI Match</div>
              <div className="text-lg font-black text-emerald-700 mt-0.5">
                {item.match_score ? `${Math.round(item.match_score)}%` : 'N/A'}
              </div>
            </div>
          </div>

          {/* Why Recommended Callout */}
          {item.why_recommended && (
            <div className="p-4 rounded-2xl bg-forest-50 border border-forest-200">
              <div className="text-xs font-black uppercase tracking-wider text-forest-800 mb-1 flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4 text-forest-700" />
                <span>Why This Food Matches You:</span>
              </div>
              <p className="text-sm font-medium text-forest-950 leading-relaxed">
                {item.why_recommended}
              </p>
            </div>
          )}

          {/* Description */}
          <div>
            <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">
              Culinary Description
            </h4>
            <p className="text-sm text-stone-700 leading-relaxed">
              {item.description}
            </p>
          </div>

          {/* Interactive Rating / Feedback Form */}
          <div className="p-4 rounded-2xl bg-cream-50 border border-cream-200">
            <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
              Leave Feedback for LocalBite AI
            </h4>
            {submitted ? (
              <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-bold flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>Thank you! Your feedback has been saved to SQLite and will train future recommendations.</span>
              </div>
            ) : (
              <form onSubmit={handleRatingSubmit} className="space-y-3">
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-stone-600 font-medium">Your rating:</span>
                  <div className="flex items-center space-x-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRatingVal(star)}
                        className="p-1 text-amber-400 hover:scale-110 transition-transform"
                      >
                        <Star className={`w-5 h-5 ${star <= ratingVal ? 'fill-amber-400' : 'text-stone-300'}`} />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Optional: What did you think of this dish?"
                    className="flex-1 py-1.5 px-3 text-xs bg-white border border-cream-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-forest-800"
                  />
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-forest-900 text-white text-xs font-bold hover:bg-forest-800"
                  >
                    Submit
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Dataset Disclaimer */}
          <div className="flex items-start space-x-2.5 p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 text-amber-900 text-xs">
            <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="leading-snug">
              <strong>PBL Academic Notice:</strong> This food entry originates from the curated Nagpur sample dataset (<code className="font-mono text-[11px] bg-amber-100 px-1 py-0.5 rounded">food_places.csv</code>). It demonstrates content-based similarity ranking and Groq agent tool calling. Real-time live table reservation or external delivery APIs can be plugged into this data layer.
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}
