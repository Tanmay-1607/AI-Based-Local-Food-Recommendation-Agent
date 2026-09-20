import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import FoodCard from './components/FoodCard';
import FoodDetailsModal from './components/FoodDetailsModal';
import ChatDrawer from './components/ChatDrawer';
import { 
  checkHealth, 
  getRecommendations, 
  submitFeedback,
  getFeedbackList,
  getApiDiagnosticInfo,
  setCustomApiUrl
} from './services/api';
import { Search, Sparkles, Utensils, AlertCircle, CheckCircle2, ArrowRight, RotateCcw, WifiOff, RefreshCw, ExternalLink, Link2 } from 'lucide-react';

const QUICK_FILTERS = [
  { label: "All Nagpur", query: "", cuisine: null, budget: null, foodType: null },
  { label: "🍊 Sweets & Desserts", query: "sweet dessert", cuisine: "Sweets & Desserts", budget: null, foodType: "veg" },
  { label: "🔥 Spicy Saoji", query: "Saoji", cuisine: "Saoji", budget: null, foodType: null },
  { label: "🥞 Tarri Poha", query: "Tarri Poha", cuisine: "Street Food", budget: null, foodType: "veg" },
  { label: "🌱 Pure Veg", query: "", cuisine: null, budget: null, foodType: "veg" },
  { label: "💰 Under ₹100", query: "", cuisine: null, budget: 100, foodType: null },
  { label: "💰 Under ₹200", query: "", cuisine: null, budget: 200, foodType: null },
  { label: "☕ Breakfast", query: "breakfast", cuisine: null, budget: 150, foodType: null },
  { label: "🍛 Biryani", query: "Biryani", cuisine: "Mughlai", budget: null, foodType: "non-veg" },
];

export default function App() {
  const [health, setHealth] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilterLabel, setActiveFilterLabel] = useState("All Nagpur");
  const [maxBudget, setMaxBudget] = useState(null);
  const [foodType, setFoodType] = useState(null);
  const [activeCuisine, setActiveCuisine] = useState(null);

  const [recommendations, setRecommendations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);

  // Modals & Chat Drawer
  const [selectedFood, setSelectedFood] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isShowingLikedOnly, setIsShowingLikedOnly] = useState(false);

  // Feedback Tracking (Saved to SQLite)
  const [likedIds, setLikedIds] = useState(new Set());
  const [dislikedIds, setDislikedIds] = useState(new Set());

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Initial Load
  useEffect(() => {
    async function init() {
      try {
        const [hData, fbData] = await Promise.allSettled([
          checkHealth(),
          getFeedbackList()
        ]);

        if (hData.status === 'fulfilled') setHealth(hData.value);
        if (fbData.status === 'fulfilled' && Array.isArray(fbData.value)) {
          const likes = new Set();
          const dislikes = new Set();
          fbData.value.forEach(fb => {
            if (fb.feedback_type === 'like' || (fb.rating && fb.rating >= 4)) likes.add(fb.restaurant_id);
            if (fb.feedback_type === 'dislike' || (fb.rating && fb.rating <= 2)) dislikes.add(fb.restaurant_id);
          });
          setLikedIds(likes);
          setDislikedIds(dislikes);
        }

        // Fetch initial recommendations
        loadRecommendations("", null, null, null);
      } catch (err) {
        console.error("Init error:", err);
        setErrorMsg("Connecting to backend... Make sure port 8000 is active.");
      }
    }
    init();
  }, []);

  const [apiDiag, setApiDiag] = useState(() => getApiDiagnosticInfo());
  const [customUrlInput, setCustomUrlInput] = useState("");

  const handleConnectCustomUrl = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const trimmed = customUrlInput.trim();
    if (!trimmed) return;
    setCustomApiUrl(trimmed);
    const updated = getApiDiagnosticInfo();
    setApiDiag(updated);
    loadRecommendations(searchQuery, maxBudget, foodType, activeCuisine);
    showToast(`Connecting to backend: ${trimmed}`);
  };

  const handleResetCustomUrl = () => {
    setCustomApiUrl("");
    setCustomUrlInput("");
    const updated = getApiDiagnosticInfo();
    setApiDiag(updated);
    loadRecommendations(searchQuery, maxBudget, foodType, activeCuisine);
    showToast("Cleared custom backend URL.");
  };

  const loadRecommendations = async (query = searchQuery, budget = maxBudget, diet = foodType, cui = activeCuisine) => {
    setIsLoading(true);
    setErrorMsg(null);
    const diag = getApiDiagnosticInfo();
    setApiDiag(diag);
    try {
      const payload = {
        query: query || "",
        cuisine: cui || null,
        max_budget: budget || null,
        food_type: diet || null,
        top_n: 15
      };
      const res = await getRecommendations(payload);
      setRecommendations(res.results || []);
      setErrorMsg(null);
    } catch (err) {
      console.error("API error:", err);
      const currentDiag = getApiDiagnosticInfo();
      setApiDiag(currentDiag);
      if (currentDiag.isMissingProductionApiUrl) {
        setErrorMsg("VITE_API_URL is not set in Vercel. Frontend cannot connect to your Render backend without it.");
      } else {
        setErrorMsg(`Failed to connect to backend at ${currentDiag.resolvedApiBase}. If using Render free tier, it may take 30-50 seconds to wake up.`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setActiveCuisine(null);
    loadRecommendations(searchQuery, maxBudget, foodType, null);
  };

  const handleQuickFilter = (item) => {
    setActiveFilterLabel(item.label);
    setSearchQuery(item.query);
    setMaxBudget(item.budget);
    setFoodType(item.foodType);
    setActiveCuisine(item.cuisine);
    setIsShowingLikedOnly(false);
    loadRecommendations(item.query, item.budget, item.foodType, item.cuisine);
  };

  const handleReset = () => {
    setSearchQuery("");
    setActiveFilterLabel("All Nagpur");
    setMaxBudget(null);
    setFoodType(null);
    setActiveCuisine(null);
    setIsShowingLikedOnly(false);
    loadRecommendations("", null, null, null);
    showToast("Filters reset to all Nagpur food.");
  };

  const handleFeedback = async (item, feedbackType, rating = null, comment = null) => {
    try {
      await submitFeedback({
        restaurant_id: item.restaurant_id,
        dish_name: item.dish_name,
        feedback_type: feedbackType,
        rating: rating,
        comment: comment
      });

      if (feedbackType === 'like' || (rating && rating >= 4)) {
        setLikedIds(prev => new Set(prev).add(item.restaurant_id));
        setDislikedIds(prev => {
          const next = new Set(prev);
          next.delete(item.restaurant_id);
          return next;
        });
        showToast(`Saved 👍 for "${item.dish_name}"!`);
      } else if (feedbackType === 'dislike' || (rating && rating <= 2)) {
        setDislikedIds(prev => new Set(prev).add(item.restaurant_id));
        setLikedIds(prev => {
          const next = new Set(prev);
          next.delete(item.restaurant_id);
          return next;
        });
        showToast(`Recorded 👎 for "${item.dish_name}".`);
      } else {
        showToast(`Rated ${rating}★ for "${item.dish_name}".`);
      }

      // Re-run to apply feedback boost
      loadRecommendations(searchQuery, maxBudget, foodType);
    } catch (err) {
      console.error("Feedback error:", err);
      showToast("Feedback error saving to SQLite.");
    }
  };

  // Items to display
  const displayedItems = isShowingLikedOnly
    ? recommendations.filter(it => likedIds.has(it.restaurant_id))
    : recommendations;

  return (
    <div className="min-h-screen bg-cream-100 flex flex-col font-sans text-stone-800 selection:bg-spice-200">
      
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-forest-950 text-white px-5 py-3 rounded-2xl shadow-pop flex items-center space-x-2 text-sm font-semibold border border-forest-800 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Navbar */}
      <Navbar 
        health={health} 
        onOpenChat={() => setIsChatOpen(true)}
        likedCount={likedIds.size}
        isShowingLikedOnly={isShowingLikedOnly}
        onToggleLikedOnly={() => setIsShowingLikedOnly(!isShowingLikedOnly)}
      />

      {/* Simple, Clean Search Hero (No Clutter) */}
      <section className="pt-8 pb-6 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full text-center">
        
        {/* Title */}
        <h1 className="text-3xl sm:text-4xl font-black text-forest-950 tracking-tight">
          What are you craving in <span className="text-spice-600">Nagpur</span> today?
        </h1>
        <p className="mt-2 text-sm text-stone-600 max-w-xl mx-auto">
          AI-powered local food discovery with real-time recommendations, Groq intelligence, and Tavily web search.
        </p>

        {/* Natural Language Search Bar */}
        <form onSubmit={handleSearchSubmit} className="mt-6 flex items-center shadow-card rounded-2xl bg-white p-2 border-2 border-cream-300 focus-within:border-forest-700 transition-all max-w-2xl mx-auto">
          <div className="pl-3 pr-2 text-forest-800 opacity-70">
            <Search className="w-5 h-5" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Try 'Spicy Saoji chicken', 'Tarri Poha in Dharampeth', 'Breakfast under ₹150'..."
            className="w-full py-2.5 px-2 text-stone-800 placeholder-stone-400 bg-transparent text-sm focus:outline-none"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="flex-shrink-0 inline-flex items-center space-x-1.5 px-5 py-2.5 rounded-xl bg-forest-900 text-white font-bold text-xs hover:bg-forest-800 active:scale-95 transition-all shadow-sm"
          >
            {isLoading ? <span>Searching...</span> : <span>Search</span>}
          </button>
        </form>

        {/* Quick Filter Pills (Clean, Replaces Complex Smart Preferences Panel) */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {QUICK_FILTERS.map((f, idx) => {
            const isActive = activeFilterLabel === f.label && !isShowingLikedOnly;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleQuickFilter(f)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                  isActive
                    ? 'bg-forest-900 text-white border-forest-900 shadow-sm scale-105'
                    : 'bg-white text-stone-600 border-cream-300 hover:bg-cream-200 hover:text-stone-900'
                }`}
              >
                {f.label}
              </button>
            );
          })}
          
          {(searchQuery || activeFilterLabel !== "All Nagpur" || isShowingLikedOnly) && (
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-full text-xs font-semibold text-stone-500 hover:text-stone-800 bg-cream-200/80 hover:bg-cream-300 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>

      </section>

      {/* Main Recommendations Grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 flex-1 w-full">
        
        {/* If backend connection error, show helpful connection guidance instead of misleading "0 spots found" */}
        {errorMsg ? (
          <div className="max-w-2xl mx-auto py-12 px-6 bg-white rounded-3xl border border-rose-200 shadow-card text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-rose-100 border border-rose-200 flex items-center justify-center mx-auto text-rose-600">
              <WifiOff className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-xl font-black text-forest-950">Backend Connection Notice</h2>
              <p className="text-sm text-stone-600 mt-2 max-w-lg mx-auto leading-relaxed">
                {errorMsg}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 text-left text-xs space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="font-bold text-stone-700">Target Backend API:</span>
                <code className="px-2 py-0.5 rounded bg-stone-200 text-stone-800 font-mono text-[11px] break-all">
                  {apiDiag.resolvedApiBase}
                </code>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-stone-600 border-t border-stone-200 pt-2">
                <span>Build Diagnostic:</span>
                <span className={`font-mono px-1.5 py-0.5 rounded text-[10px] font-semibold ${apiDiag.hasEnvVar ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                  {apiDiag.hasEnvVar ? 'VITE_API_URL detected in build' : 'VITE_API_URL not baked into current build'}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-stone-600">
                <span>Config Source:</span>
                <span className="font-mono text-stone-700 text-[10px]">{apiDiag.configSource}</span>
              </div>

              {apiDiag.isMissingProductionApiUrl && (
                <div className="pt-2.5 border-t border-stone-200 text-amber-900 bg-amber-50 p-3.5 rounded-xl space-y-2.5">
                  <p className="font-bold text-xs flex items-center space-x-1.5 text-amber-950">
                    <span>⚠️ Vercel Setup Step:</span>
                  </p>
                  <p className="text-[11px] text-stone-700 leading-relaxed">
                    Your frontend is deployed on Vercel, but <code className="bg-amber-100 font-bold px-1 py-0.5 rounded font-mono">VITE_API_URL</code> was not embedded in this build.
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-stone-800 text-[11px] font-medium pt-1">
                    <li>In Vercel Dashboard ➔ Project ➔ <strong>Settings</strong> ➔ <strong>Environment Variables</strong>.</li>
                    <li>Add Key: <code className="bg-white border border-amber-300 font-bold px-1 py-0.5 rounded font-mono">VITE_API_URL</code> (Value: your Render URL).</li>
                    <li>Go to <strong>Deployments</strong> ➔ Click <strong>...</strong> ➔ <strong>Redeploy</strong> (ensure <strong>Use existing Build Cache</strong> is <strong>UNCHECKED</strong>).</li>
                  </ol>

                  {/* Instant Quick-Connect Form */}
                  <form onSubmit={handleConnectCustomUrl} className="mt-2 pt-2 border-t border-amber-200 space-y-1.5">
                    <label className="block text-[11px] font-bold text-stone-800">
                      ⚡ Quick Connect (Connect immediately right now):
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="url"
                        value={customUrlInput}
                        onChange={(e) => setCustomUrlInput(e.target.value)}
                        placeholder="https://your-backend-name.onrender.com"
                        className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-amber-300 bg-white font-mono text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      <button
                        type="submit"
                        className="px-3.5 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer whitespace-nowrap"
                      >
                        Connect Now
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {apiDiag.hasStoredUrl && (
                <div className="pt-2 border-t border-stone-200 flex items-center justify-between">
                  <span className="text-[10px] text-stone-500">Using browser-connected backend URL</span>
                  <button
                    type="button"
                    onClick={handleResetCustomUrl}
                    className="text-[10px] font-bold text-rose-600 hover:underline cursor-pointer"
                  >
                    Reset to Default
                  </button>
                </div>
              )}

              {!apiDiag.isMissingProductionApiUrl && (
                <p className="text-stone-500 text-[11px] pt-1 border-t border-stone-200">
                  Render Free Tier Note: If your Render web service recently went to sleep, the first request takes ~30–50 seconds to boot up.
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => loadRecommendations()}
                disabled={isLoading}
                className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-forest-900 text-white text-xs font-bold hover:bg-forest-800 transition-all shadow-md disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>{isLoading ? 'Connecting...' : 'Retry Connection'}</span>
              </button>

              {!apiDiag.isMissingProductionApiUrl && apiDiag.resolvedApiBase.startsWith('http') && (
                <a
                  href={`${apiDiag.resolvedApiBase}/health`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl border border-cream-300 text-stone-700 text-xs font-bold hover:bg-cream-100 transition-all"
                >
                  <span>Check API Health</span>
                  <ExternalLink className="w-3 h-3 text-stone-400" />
                </a>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Results Header */}
            <div className="flex items-center justify-between pb-3 mb-6 border-b border-cream-300">
              <div>
                <h2 className="text-lg sm:text-xl font-black text-forest-950 flex items-center space-x-2">
                  <Utensils className="w-5 h-5 text-spice-600" />
                  <span>
                    {isShowingLikedOnly 
                      ? 'Your Saved Favorite Dishes' 
                      : (activeFilterLabel !== "All Nagpur" ? `${activeFilterLabel} Food Results` : 'Authentic Nagpur Recommendations')}
                  </span>
                </h2>
                <p className="text-xs text-stone-500 font-medium">
                  Ranked by TF-IDF Content Similarity, Budget Fit, Ratings & SQLite Personalization
                </p>
              </div>

              <div className="text-xs font-bold text-stone-600 px-3 py-1.5 rounded-full bg-white border border-cream-300 shadow-soft">
                Showing <span className="text-forest-900 font-black">{displayedItems.length}</span> spots
              </div>
            </div>

            {/* Cards Grid */}
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 py-8">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <div key={n} className="h-60 rounded-3xl bg-white/70 border border-cream-200 animate-pulse p-5 space-y-3">
                    <div className="h-4 bg-cream-300 rounded w-1/3" />
                    <div className="h-6 bg-cream-300 rounded w-3/4" />
                    <div className="h-4 bg-cream-200 rounded w-1/2" />
                    <div className="h-16 bg-cream-200 rounded-xl" />
                  </div>
                ))}
              </div>
            ) : displayedItems.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayedItems.map((item) => (
                  <FoodCard 
                    key={item.restaurant_id}
                    item={item}
                    onSelectDetails={setSelectedFood}
                    onFeedback={handleFeedback}
                    isLiked={likedIds.has(item.restaurant_id)}
                    isDisliked={dislikedIds.has(item.restaurant_id)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 px-4 bg-white rounded-3xl border border-cream-300 shadow-card max-w-md mx-auto">
                <div className="w-14 h-14 rounded-full bg-cream-200 flex items-center justify-center mx-auto mb-3 text-2xl">
                  {isShowingLikedOnly ? '❤️' : '🔍'}
                </div>
                <h3 className="text-base font-bold text-forest-950">
                  {isShowingLikedOnly ? 'No saved favorites yet' : 'No matching places found'}
                </h3>
                <p className="text-xs text-stone-500 mt-1.5 leading-relaxed">
                  {isShowingLikedOnly 
                    ? 'Click the 👍 button on any food card to save it here for quick access!' 
                    : 'Try typing a simpler query or click "All Nagpur" above.'}
                </p>
                <button
                  type="button"
                  onClick={handleReset}
                  className="mt-4 px-4 py-2 rounded-xl bg-forest-900 text-white font-bold text-xs hover:bg-forest-800 transition-colors"
                >
                  Show All Nagpur Food
                </button>
              </div>
            )}
          </>
        )}

      </main>

      {/* Food Details Modal */}
      {selectedFood && (
        <FoodDetailsModal 
          item={selectedFood}
          onClose={() => setSelectedFood(null)}
          onFeedback={handleFeedback}
        />
      )}

      {/* Conversational AI Concierge Drawer (Groq + Tavily) */}
      <ChatDrawer 
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        onSelectFood={(food) => {
          setSelectedFood(food);
          setIsChatOpen(false);
        }}
      />

      {/* Footer */}
      <footer className="mt-auto bg-forest-950 text-cream-400 py-6 border-t border-forest-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2">
            <span className="text-base">🍲</span>
            <span className="font-extrabold text-white">LocalBite AI</span>
            <span>— Nagpur Food Recommendation PBL</span>
          </div>
          <p className="text-stone-400">
            Powered by React, FastAPI, Groq AI & Tavily Search API
          </p>
        </div>
      </footer>

    </div>
  );
}
