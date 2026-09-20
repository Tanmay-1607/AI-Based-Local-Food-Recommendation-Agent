import React, { useState } from 'react';
import { Search, Sparkles, MapPin, ArrowRight } from 'lucide-react';

const SUGGESTED_QUERIES = [
  "Recommend spicy vegetarian food near Dharampeth under ₹200",
  "Find Maharashtrian breakfast options under ₹100",
  "Authentic fiery Saoji mutton in Mahal or Gandhibagh",
  "Crispy butter dosa in Sadar with filter coffee",
  "Sweet famous Nagpur orange Santra Barfi"
];

export default function SearchHero({ searchQuery, setSearchQuery, onSearch, isLoading }) {
  const [localInput, setLocalInput] = useState(searchQuery || "");

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch(localInput);
  };

  const handleChipClick = (queryText) => {
    setLocalInput(queryText);
    onSearch(queryText);
  };

  return (
    <div className="relative pt-8 pb-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
      
      {/* Decorative accent pill */}
      <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-spice-100 border border-spice-200 text-spice-700 text-xs font-semibold mb-5 shadow-sm">
        <Sparkles className="w-3.5 h-3.5 text-spice-600" />
        <span>Content-Based TF-IDF Recommender & LangChain Groq Agent</span>
      </div>

      {/* Main Title */}
      <h1 className="text-3xl sm:text-5xl font-black text-forest-950 tracking-tight max-w-3xl mx-auto leading-tight">
        Discover Authentic Nagpur Food <span className="text-spice-600 underline decoration-spice-300 decoration-wavy decoration-2">Curated by AI</span>
      </h1>

      <p className="mt-4 text-sm sm:text-base text-stone-600 max-w-2xl mx-auto leading-relaxed">
        Describe your cravings in plain English. Our agent filters authentic local eateries by budget, spice tolerance, locality, and reviews with transparent match explanations.
      </p>

      {/* Natural Language Search Input Box */}
      <div className="mt-8 max-w-3xl mx-auto">
        <form onSubmit={handleSubmit} className="relative flex items-center shadow-card rounded-2xl bg-white p-2 border-2 border-cream-300 focus-within:border-forest-700 transition-all">
          <div className="pl-3 pr-2 text-forest-800">
            <Search className="w-5 h-5 text-forest-800 opacity-70" />
          </div>
          <input
            type="text"
            value={localInput}
            onChange={(e) => setLocalInput(e.target.value)}
            placeholder="e.g. 'Recommend spicy vegetarian food near Dharampeth under ₹200'..."
            className="w-full py-3 px-2 text-stone-800 placeholder-stone-400 bg-transparent text-sm sm:text-base focus:outline-none"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="flex-shrink-0 inline-flex items-center space-x-2 px-5 py-3 rounded-xl bg-forest-900 text-white font-semibold text-sm hover:bg-forest-800 active:scale-95 transition-all shadow-sm"
          >
            {isLoading ? (
              <span className="flex items-center space-x-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Searching...</span>
              </span>
            ) : (
              <>
                <span>Search</span>
                <ArrowRight className="w-4 h-4 text-spice-400" />
              </>
            )}
          </button>
        </form>

        {/* Suggestion Chips */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs">
          <span className="text-stone-400 font-medium mr-1">Try asking:</span>
          {SUGGESTED_QUERIES.map((q, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleChipClick(q)}
              className="px-3 py-1.5 rounded-full bg-cream-200/90 hover:bg-cream-300/80 text-stone-700 font-medium transition-colors border border-cream-300/60"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}
