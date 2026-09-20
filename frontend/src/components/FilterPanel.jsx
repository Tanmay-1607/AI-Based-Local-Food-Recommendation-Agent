import React from 'react';
import { SlidersHorizontal, RotateCcw, Flame, IndianRupee, MapPin, Utensils } from 'lucide-react';

const BUDGET_PRESETS = [100, 200, 350, 500];

export default function FilterPanel({
  filters,
  setFilters,
  metadata,
  onApply,
  onReset,
  isLoading
}) {
  const localities = metadata?.localities || [];
  const cuisines = metadata?.cuisines || [];

  const handleDietChange = (diet) => {
    setFilters(prev => ({ ...prev, food_type: diet }));
  };

  const handleSpiceChange = (spice) => {
    setFilters(prev => ({ ...prev, spice_level: spice }));
  };

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-card border border-cream-300">
      <div className="flex items-center justify-between pb-4 mb-5 border-b border-cream-200">
        <div className="flex items-center space-x-2 text-forest-950 font-bold text-lg">
          <SlidersHorizontal className="w-5 h-5 text-spice-600" />
          <span>Smart Preferences Panel</span>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center space-x-1.5 text-xs text-stone-500 hover:text-stone-800 font-semibold px-2.5 py-1.5 rounded-lg hover:bg-cream-100 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Locality Dropdown */}
        <div>
          <label className="flex items-center space-x-1.5 text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
            <MapPin className="w-3.5 h-3.5 text-forest-800" />
            <span>Locality in Nagpur</span>
          </label>
          <select
            value={filters.locality || "all"}
            onChange={(e) => setFilters(prev => ({ ...prev, locality: e.target.value === "all" ? null : e.target.value }))}
            className="w-full py-2.5 px-3 rounded-xl bg-cream-50 border border-cream-300 text-stone-800 text-sm font-medium focus:ring-2 focus:ring-forest-700 focus:outline-none"
          >
            <option value="all">📍 All Localities (Nagpur Wide)</option>
            {localities.map((loc) => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>
        </div>

        {/* Cuisine Dropdown */}
        <div>
          <label className="flex items-center space-x-1.5 text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
            <Utensils className="w-3.5 h-3.5 text-forest-800" />
            <span>Cuisine Preference</span>
          </label>
          <select
            value={filters.cuisine || "all"}
            onChange={(e) => setFilters(prev => ({ ...prev, cuisine: e.target.value === "all" ? null : e.target.value }))}
            className="w-full py-2.5 px-3 rounded-xl bg-cream-50 border border-cream-300 text-stone-800 text-sm font-medium focus:ring-2 focus:ring-forest-700 focus:outline-none"
          >
            <option value="all">🍽️ All Cuisines</option>
            {cuisines.map((cui) => (
              <option key={cui} value={cui}>{cui}</option>
            ))}
          </select>
        </div>

        {/* Budget Slider */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="flex items-center space-x-1.5 text-xs font-bold text-stone-700 uppercase tracking-wider">
              <IndianRupee className="w-3.5 h-3.5 text-forest-800" />
              <span>Max Budget</span>
            </label>
            <span className="text-xs font-black px-2 py-0.5 rounded-md bg-forest-100 text-forest-900 border border-forest-200">
              ₹{filters.max_budget || 500}
            </span>
          </div>
          <input
            type="range"
            min="50"
            max="1000"
            step="25"
            value={filters.max_budget || 500}
            onChange={(e) => setFilters(prev => ({ ...prev, max_budget: Number(e.target.value) }))}
            className="w-full accent-forest-800 cursor-pointer h-2 bg-cream-300 rounded-lg"
          />
          <div className="flex items-center justify-between mt-2">
            {BUDGET_PRESETS.map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setFilters(prev => ({ ...prev, max_budget: b }))}
                className={`text-[11px] px-2 py-0.5 rounded-md font-bold transition-colors ${
                  filters.max_budget === b
                    ? 'bg-forest-900 text-white'
                    : 'bg-cream-200 text-stone-600 hover:bg-cream-300'
                }`}
              >
                ₹{b}
              </button>
            ))}
          </div>
        </div>

        {/* Dietary and Spice preference */}
        <div>
          <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
            Dietary Choice
          </label>
          <div className="grid grid-cols-4 gap-1.5 p-1 bg-cream-100 rounded-xl border border-cream-200">
            {[
              { id: 'all', label: 'All' },
              { id: 'veg', label: 'Veg', dot: 'bg-emerald-500' },
              { id: 'non-veg', label: 'Non-Veg', dot: 'bg-rose-500' },
              { id: 'egg', label: 'Egg', dot: 'bg-amber-500' },
            ].map((diet) => {
              const active = (filters.food_type || 'all') === diet.id;
              return (
                <button
                  key={diet.id}
                  type="button"
                  onClick={() => handleDietChange(diet.id === 'all' ? null : diet.id)}
                  className={`py-1 px-1.5 rounded-lg text-xs font-bold flex items-center justify-center space-x-1 transition-all ${
                    active
                      ? 'bg-forest-900 text-white shadow-sm'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-cream-200'
                  }`}
                >
                  {diet.dot && <span className={`w-2 h-2 rounded-full ${diet.dot}`} />}
                  <span>{diet.label}</span>
                </button>
              );
            })}
          </div>

          {/* Spice Rating Slider */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs mb-1 font-semibold text-stone-600">
              <span className="flex items-center space-x-1">
                <Flame className="w-3.5 h-3.5 text-spice-600" />
                <span>Spice Level:</span>
              </span>
              <span className="text-spice-700 font-bold">
                {filters.spice_level ? `${filters.spice_level}/5 🌶️` : 'Any'}
              </span>
            </div>
            <div className="flex items-center space-x-1">
              {[1, 2, 3, 4, 5].map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => handleSpiceChange(filters.spice_level === lvl ? null : lvl)}
                  className={`flex-1 py-1 rounded text-xs font-black transition-all ${
                    filters.spice_level === lvl
                      ? 'bg-spice-600 text-white shadow-sm scale-105'
                      : (filters.spice_level && filters.spice_level > lvl)
                      ? 'bg-spice-200 text-spice-800'
                      : 'bg-cream-200 text-stone-600 hover:bg-cream-300'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Action CTA */}
      <div className="mt-6 pt-4 border-t border-cream-200 flex items-center justify-end space-x-3">
        <button
          type="button"
          onClick={onApply}
          disabled={isLoading}
          className="px-6 py-2.5 rounded-xl bg-forest-900 text-white font-bold text-sm hover:bg-forest-800 active:scale-95 transition-all shadow-md shadow-forest-900/10"
        >
          {isLoading ? 'Recalculating...' : 'Apply Filters & Recommend'}
        </button>
      </div>

    </div>
  );
}
