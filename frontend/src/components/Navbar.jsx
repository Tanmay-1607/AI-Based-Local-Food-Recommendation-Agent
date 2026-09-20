import React from 'react';
import { Sparkles, Heart, ExternalLink, Globe } from 'lucide-react';

export default function Navbar({ health, onOpenChat, likedCount = 0, isShowingLikedOnly = false, onToggleLikedOnly }) {
  const isGroq = health?.groq_configured;
  const isTavily = health?.tavily_configured;

  return (
    <header className="sticky top-0 z-40 bg-cream-50/90 backdrop-blur-md border-b border-cream-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-forest-900 to-forest-700 flex items-center justify-center text-white shadow-md shadow-forest-900/10">
            <span className="text-2xl">🍲</span>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xl font-extrabold tracking-tight text-forest-950 font-sans">
                LocalBite<span className="text-spice-600 font-black">.AI</span>
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-forest-100 text-forest-800 border border-forest-200">
                Nagpur
              </span>
            </div>
            <p className="text-xs text-stone-500 font-medium">Smart AI Food & Craving Agent</p>
          </div>
        </div>

        {/* Status and Action Buttons */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          
          {/* AI Engine & Web Badges */}
          <div className="hidden lg:flex items-center space-x-2">
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-cream-200/80 border border-cream-300 text-xs text-stone-700">
              <span className={`w-2 h-2 rounded-full ${isGroq ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <span className="font-semibold">
                {isGroq ? 'Groq AI Active' : 'Local AI'}
              </span>
            </div>
            {isTavily && (
              <div className="flex items-center space-x-1 px-2.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-semibold" title="Tavily Live Search Connected">
                <Globe className="w-3 h-3 text-emerald-600" />
                <span>Tavily Web</span>
              </div>
            )}
          </div>

          {/* Gradio Playground Link */}
          <a
            href="http://127.0.0.1:7860"
            target="_blank"
            rel="noopener noreferrer"
            title="Open Gradio Playground"
            className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-forest-900 bg-forest-50 hover:bg-forest-100 border border-forest-200 transition-colors"
          >
            <span>Gradio Lab</span>
            <ExternalLink className="w-3 h-3 opacity-70" />
          </a>

          {/* Liked Favorites Toggle Button */}
          <button
            type="button"
            onClick={onToggleLikedOnly}
            title={isShowingLikedOnly ? "Show all recommendations" : "Filter my liked places"}
            className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
              isShowingLikedOnly
                ? 'bg-spice-600 text-white border-spice-600 shadow-sm'
                : 'bg-spice-50 text-spice-700 border-spice-200 hover:bg-spice-100'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${isShowingLikedOnly ? 'fill-white text-white' : 'fill-spice-500 text-spice-500'}`} />
            <span>{likedCount}</span>
            <span className="hidden md:inline">{isShowingLikedOnly ? 'Liked (Active)' : 'Saved'}</span>
          </button>

          {/* Open AI Assistant Button */}
          <button
            onClick={onOpenChat}
            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-forest-900 hover:bg-forest-800 active:scale-95 shadow-md shadow-forest-900/15 transition-all"
          >
            <Sparkles className="w-4 h-4 text-spice-400" />
            <span className="hidden sm:inline">Ask AI Agent</span>
            <span className="sm:hidden">Chat</span>
          </button>
        </div>

      </div>
    </header>
  );
}
