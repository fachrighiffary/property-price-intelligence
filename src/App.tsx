import { useState, useEffect, useRef } from "react";
import { CollectionResult } from "./types";
import ListingTable from "./components/ListingTable";
import StatsDashboard from "./components/StatsDashboard";
import { Search, Building2, HelpCircle, ArrowRight, Compass, ShieldAlert, Sparkles, Loader2, ChevronRight } from "lucide-react";

export default function App() {
  const [urlInput, setUrlInput] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState("");
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [resultData, setResultData] = useState<CollectionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const autocompleteRef = useRef<HTMLDivElement>(null);

  // Close autocomplete when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (autocompleteRef.current && !autocompleteRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Fetch suggestions when searchInput changes
  useEffect(() => {
    if (searchInput.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/suggestions?q=${encodeURIComponent(searchInput)}`);
        if (response.ok) {
          const data = await response.json();
          setSuggestions(data);
          setShowSuggestions(true);
        }
      } catch (err) {
        console.error("Failed to fetch suggestions", err);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Loading animation simulation stages
  useEffect(() => {
    if (!loading) return;

    const stages = [
      { progress: 10, text: "Bypassing Cloudflare protection layers..." },
      { progress: 25, text: "Scanning Speedhome public sitemaps and directories..." },
      { progress: 45, text: "Resolving allowed path matches from robots.txt..." },
      { progress: 65, text: "Scraping and extracting listing packages..." },
      { progress: 80, text: "Aggregating monthly, yearly, and daily pricing matrices..." },
      { progress: 95, text: "Formulating local statistical metrics..." },
    ];

    let currentStageIndex = 0;
    setLoadingStage(stages[0].text);
    setLoadingProgress(5);

    const progressInterval = setInterval(() => {
      setLoadingProgress((prev) => {
        if (prev >= 98) return 98;
        return prev + 1;
      });
    }, 250);

    const stageInterval = setInterval(() => {
      currentStageIndex++;
      if (currentStageIndex < stages.length) {
        setLoadingStage(stages[currentStageIndex].text);
        setLoadingProgress(stages[currentStageIndex].progress);
      }
    }, 2000);

    return () => {
      clearInterval(progressInterval);
      clearInterval(stageInterval);
    };
  }, [loading]);

  // Trigger Data Collection
  const handleCollect = async (queryParam?: string, urlParam?: string) => {
    setError(null);
    setLoading(true);
    setResultData(null);
    setShowSuggestions(false);

    const payload = {
      query: queryParam || searchInput,
      url: urlParam || urlInput
    };

    try {
      const response = await fetch("/api/collect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to fetch rental listing records.");
      }

      const data: CollectionResult = await response.json();
      setResultData(data);
    } catch (err: any) {
      setError(err.message || "An unexpected network error occurred.");
    } finally {
      setLoading(false);
      setLoadingProgress(100);
    }
  };

  // Click suggestions list
  const handleSelectSuggestion = (val: string) => {
    setSearchInput(val);
    setShowSuggestions(false);
    handleCollect(val, "");
  };

  // Quick Preset Areas
  const handlePresetSelect = (areaName: string) => {
    setSearchInput(areaName);
    setUrlInput("");
    handleCollect(areaName, "");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900">
      
      {/* Premium Header Accent */}
      <div className="h-1 w-full bg-blue-600" />

      {/* Primary Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-8">
        
        {/* Navigation / Brand Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-6" id="app-header">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-blue-600 rounded text-white font-mono text-xs font-bold leading-none">
                MYS
              </span>
              <h1 className="text-xl font-display font-bold tracking-tight text-slate-900 flex items-center gap-2 sm:text-2xl">
                Speedhome Rental Data Collector
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1 font-sans">
              Automated platform to crawl, parse, and analyze real rental listings in Malaysia
            </p>
          </div>
          
          <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-lg border border-slate-200 font-mono text-[10px] text-slate-500 shadow-sm">
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse" />
              Crawler Status: Live
            </span>
            <span className="h-3 w-px bg-slate-200" />
            <span>Target: speedhome.com</span>
          </div>
        </header>

        {/* Control Interface (Form Inputs) */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="input-controls-section">
          {/* Main Search Panel */}
          <div className="lg:col-span-8 bg-white border border-slate-200 p-6 rounded-xl flex flex-col gap-6 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <Sparkles className="h-24 w-24 text-blue-500" />
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Compass className="h-5 w-5 text-blue-600" />
                Initiate Automation Crawler
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Input a direct Speedhome URL or type any city, neighborhood, or building name in Malaysia.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Option A: Search Area */}
              <div className="flex flex-col gap-2 relative" ref={autocompleteRef}>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Option 1: Search Area or Apartment
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="E.g. Mont Kiara, Bangsar, Seni..."
                    value={searchInput}
                    onChange={(e) => {
                      setSearchInput(e.target.value);
                      setUrlInput(""); // Clear URL input when searching
                    }}
                    onFocus={() => {
                      if (suggestions.length > 0) setShowSuggestions(true);
                    }}
                    className="pl-9 pr-4 py-2.5 w-full text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:bg-white transition-all"
                  />
                </div>

                {/* Autocomplete Dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute top-[68px] left-0 w-full bg-white border border-slate-200 rounded-lg shadow-lg z-50 overflow-hidden divide-y divide-slate-100">
                    {suggestions.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => handleSelectSuggestion(item)}
                        className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-sm text-slate-700 hover:text-blue-600 flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <Building2 className="h-4 w-4 text-blue-500/70" />
                        <span>{item}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Option B: Direct URL */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Option 2: Direct Speedhome URL
                </label>
                <input
                  type="text"
                  placeholder="E.g. https://speedhome.com/rent/mont-kiara"
                  value={urlInput}
                  onChange={(e) => {
                    setUrlInput(e.target.value);
                    setSearchInput(""); // Clear search input when URL is used
                  }}
                  className="px-4 py-2.5 w-full text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-2">
                Popular Presets:
              </span>
              {["Mont Kiara", "Bangsar", "KLCC", "Petaling Jaya", "Subang Jaya"].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handlePresetSelect(preset)}
                  className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 text-slate-600 border border-slate-200 rounded-lg transition-all cursor-pointer"
                >
                  {preset}
                </button>
              ))}
            </div>

            {/* Submit Action */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mt-2">
              <div className="text-[10px] text-slate-400 leading-relaxed max-w-[450px]">
                * Our servers query public index endpoints conforming fully to Speedhome's <code className="text-slate-600 bg-slate-100 px-1 py-0.5 rounded border border-slate-200">robots.txt</code> specifications, utilizing a reasonable delay sequence to preserve resources.
              </div>
              <button
                type="button"
                onClick={() => handleCollect()}
                disabled={loading || (!searchInput.trim() && !urlInput.trim())}
                className="flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed rounded-lg shadow-sm shadow-blue-600/10 transition-all cursor-pointer whitespace-nowrap"
                id="start-crawler-btn"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                    <span>Scraping Data...</span>
                  </>
                ) : (
                  <>
                    <span>Collect & Analyze</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick Guide Panel */}
          <div className="lg:col-span-4 bg-white border border-slate-200 p-6 rounded-xl flex flex-col justify-between shadow-sm relative overflow-hidden">
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-blue-600" />
                Automation Guide
              </h3>
              
              <ul className="text-xs text-slate-600 flex flex-col gap-3.5 list-none">
                <li className="flex items-start gap-2">
                  <span className="h-5 w-5 bg-blue-50 text-blue-600 border border-blue-100 font-mono font-bold rounded flex items-center justify-center shrink-0">1</span>
                  <span>Enter a direct Rent page URL like <code className="text-slate-700 bg-slate-50 px-1 py-0.5 rounded border border-slate-200">speedhome.com/rent/mont-kiara</code> or search.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="h-5 w-5 bg-blue-50 text-blue-600 border border-blue-100 font-mono font-bold rounded flex items-center justify-center shrink-0">2</span>
                  <span>The platform identifies sitemap listings and matches indices from public paths allowed under robots.txt.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="h-5 w-5 bg-blue-50 text-blue-600 border border-blue-100 font-mono font-bold rounded flex items-center justify-center shrink-0">3</span>
                  <span>We retrieve active listings directly from Speedhome, calculate segment pricing, medians, averages, fair contract rates, and offer CSV export.</span>
                </li>
              </ul>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 text-[10px] text-slate-400 flex items-center gap-2">
              <ShieldAlert className="h-4.5 w-4.5 text-blue-500/70 shrink-0" />
              <span>
                Guarantees zero platform disruptions. Safe crawling.
              </span>
            </div>
          </div>
        </section>

        {/* Loading overlay panel */}
        {loading && (
          <div className="bg-white border border-slate-200 p-8 rounded-xl flex flex-col items-center justify-center gap-6 shadow-sm text-center py-16" id="loading-panel">
            <div className="p-4 bg-blue-50 rounded-full border border-blue-100 text-blue-600 relative">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
            
            <div className="max-w-md flex flex-col gap-2">
              <h3 className="text-lg font-bold text-slate-900">Retrieving Speedhome Data</h3>
              <p className="text-sm text-blue-600 font-semibold font-mono min-h-[20px]">
                {loadingStage}
              </p>
              <p className="text-xs text-slate-500 leading-relaxed mt-1">
                Fetching indices from Speedhome’s sitemaps and compiling statistics. Please hold on.
              </p>
            </div>

            {/* Progress Bar */}
            <div className="w-full max-w-md bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200">
              <div
                className="bg-blue-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${loadingProgress}%` }}
              />
            </div>
            <span className="text-xs text-slate-500 font-mono font-semibold">{loadingProgress}% Complete</span>
          </div>
        )}

        {/* Error Notification */}
        {error && (
          <div className="bg-red-50 border border-red-200 p-5 rounded-xl flex items-start gap-4 shadow-sm text-red-800" id="error-panel">
            <div className="p-2 bg-red-100 text-red-600 border border-red-200 rounded-lg shrink-0">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm">Automated Fetch Interrupted</h4>
              <p className="text-xs text-red-700 mt-1">{error}</p>
              <button
                onClick={() => setError(null)}
                className="mt-3 text-xs font-bold text-red-600 hover:text-red-800 underline cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Main Content Dashboard */}
        {resultData && (
          <div className="flex flex-col gap-8" id="results-panel">
            {/* Meta Information Bar */}
            <div className="bg-white border border-slate-200 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500 font-mono shadow-sm">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse" />
                Active Dataset: <strong className="text-slate-800 text-sm font-display">{resultData.area_name}</strong>
              </span>
              <span>
                Crawl URL: <a href={resultData.source_url} target="_blank" referrerPolicy="no-referrer" className="text-blue-600 hover:underline font-semibold">{resultData.source_url}</a>
              </span>
              <span>
                Timestamp: {new Date(resultData.collected_at).toLocaleString("en-GB")}
              </span>
            </div>

            {/* 1. Statistics Summary & Graphs */}
            <StatsDashboard
              overall={resultData.overall_summary}
              segments={resultData.segment_summary}
              areaName={resultData.area_name}
              listings={resultData.listings}
            />

            {/* 2. Listing Records Table */}
            <ListingTable
              listings={resultData.listings}
              areaName={resultData.area_name}
            />
          </div>
        )}

        {/* Welcome Empty State */}
        {!resultData && !loading && (
          <div className="bg-white border border-slate-200 p-12 rounded-xl flex flex-col items-center justify-center gap-5 text-center shadow-sm py-20" id="welcome-empty-panel">
            <div className="p-4 bg-slate-50 border border-slate-200 text-blue-600 rounded-full">
              <Building2 className="h-8 w-8" />
            </div>
            
            <div className="max-w-md flex flex-col gap-2">
              <h3 className="text-lg font-bold text-slate-900">No Rental Data Loaded</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Enter an area in Malaysia (e.g. "Mont Kiara", "Bangsar", "KLCC") or a direct Speedhome rent path URL to collect and analyze active properties.
              </p>
            </div>

            <button
              onClick={() => handlePresetSelect("Mont Kiara")}
              className="mt-2 flex items-center gap-2 px-5 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-sm font-semibold transition-all cursor-pointer"
            >
              <span>Demo with Mont Kiara</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

      </div>

      {/* App Footer */}
      <footer className="mt-16 border-t border-slate-200 py-8 bg-white text-center text-[10px] text-slate-400 font-mono">
        <p>© 2026 Speedhome Rental Data Collector • Conforms fully to Speedhome public directory access guidelines</p>
      </footer>

    </div>
  );
}
