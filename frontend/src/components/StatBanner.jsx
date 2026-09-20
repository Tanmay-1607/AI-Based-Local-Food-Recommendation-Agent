import React from 'react';
import { MapPin, UtensilsCrossed, Sparkles, ShieldCheck } from 'lucide-react';

export default function StatBanner({ totalCount = 45, localityCount = 12, aiMode = "TF-IDF + Groq" }) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 mb-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        
        <div className="p-3.5 rounded-2xl bg-white border border-cream-300 shadow-soft flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-forest-50 flex items-center justify-center text-forest-800 flex-shrink-0">
            <UtensilsCrossed className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-stone-500 font-bold uppercase tracking-wider">Nagpur Spots</div>
            <div className="text-lg font-black text-forest-950">{totalCount}+ Curated</div>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-cream-300 shadow-soft flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-spice-50 flex items-center justify-center text-spice-700 flex-shrink-0">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-stone-500 font-bold uppercase tracking-wider">Localities</div>
            <div className="text-lg font-black text-forest-950">{localityCount} Key Areas</div>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-cream-300 shadow-soft flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-700 flex-shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-stone-500 font-bold uppercase tracking-wider">Scoring Engine</div>
            <div className="text-lg font-black text-forest-950">TF-IDF Vectorized</div>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-cream-300 shadow-soft flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-800 flex-shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-stone-500 font-bold uppercase tracking-wider">Personalization</div>
            <div className="text-lg font-black text-forest-950">SQLite Feedback</div>
          </div>
        </div>

      </div>
    </div>
  );
}
