import { useState, useMemo } from "react";
import { Listing, SummaryStats, SegmentSummary } from "../types";
import { 
  Coins, 
  CheckSquare, 
  Layers, 
  Home, 
  Scale, 
  Maximize, 
  FileSpreadsheet, 
  Info, 
  ShieldAlert, 
  Award, 
  ChevronDown, 
  ChevronUp, 
  AlertTriangle, 
  CheckCircle2,
  TrendingDown,
  Sparkles
} from "lucide-react";

interface StatsDashboardProps {
  overall: SummaryStats;
  segments: SegmentSummary[];
  areaName: string;
  listings: Listing[];
}

interface MarketRange {
  min: number;
  max: number;
}

// Typical market rent ranges for common regions in Malaysia
const MARKET_RANGES: Record<string, Record<string, MarketRange>> = {
  "mont kiara": {
    "Studio": { min: 1200, max: 2500 },
    "1 Bedroom": { min: 1600, max: 3200 },
    "2 Bedrooms": { min: 2200, max: 4500 },
    "3 Bedrooms": { min: 2800, max: 6000 },
    "4 Bedrooms": { min: 4000, max: 10000 },
    "5+ Bedrooms": { min: 6000, max: 15000 },
  },
  "bangsar": {
    "Studio": { min: 1500, max: 3000 },
    "1 Bedroom": { min: 1800, max: 3500 },
    "2 Bedrooms": { min: 2500, max: 5000 },
    "3 Bedrooms": { min: 3500, max: 8000 },
    "4 Bedrooms": { min: 5000, max: 12000 },
    "5+ Bedrooms": { min: 7000, max: 18000 },
  },
  "klcc": {
    "Studio": { min: 1800, max: 3500 },
    "1 Bedroom": { min: 2200, max: 4500 },
    "2 Bedrooms": { min: 3200, max: 7000 },
    "3 Bedrooms": { min: 4500, max: 12000 },
    "4 Bedrooms": { min: 6500, max: 18000 },
    "5+ Bedrooms": { min: 9000, max: 25000 },
  },
  "petaling jaya": {
    "Studio": { min: 1000, max: 1800 },
    "1 Bedroom": { min: 1200, max: 2200 },
    "2 Bedrooms": { min: 1600, max: 3000 },
    "3 Bedrooms": { min: 2000, max: 4200 },
    "4 Bedrooms": { min: 2800, max: 6000 },
    "5+ Bedrooms": { min: 4000, max: 9000 },
  },
  "subang jaya": {
    "Studio": { min: 900, max: 1600 },
    "1 Bedroom": { min: 1100, max: 2000 },
    "2 Bedrooms": { min: 1400, max: 2600 },
    "3 Bedrooms": { min: 1800, max: 3600 },
    "4 Bedrooms": { min: 2400, max: 5000 },
    "5+ Bedrooms": { min: 3500, max: 8000 },
  }
};

const DEFAULT_RANGES: Record<string, MarketRange> = {
  "Studio": { min: 800, max: 2000 },
  "1 Bedroom": { min: 1000, max: 2500 },
  "2 Bedrooms": { min: 1300, max: 3500 },
  "3 Bedrooms": { min: 1600, max: 4500 },
  "4 Bedrooms": { min: 2200, max: 6500 },
  "5+ Bedrooms": { min: 3000, max: 10000 }
};

interface Anomaly {
  id: string;
  title: string;
  property_name: string;
  bedrooms: string;
  price_monthly: number;
  size_sqft: number;
  type: "extreme_low" | "extreme_high" | "slight_low" | "slight_high" | "suspicious_size";
  expectedRange: { min: number; max: number };
  explanation: string;
}

export default function StatsDashboard({ overall, segments, areaName, listings }: StatsDashboardProps) {
  const [showAnomalies, setShowAnomalies] = useState(false);

  // Compute Data Quality Index
  const dqi = useMemo(() => {
    const lowerArea = areaName.toLowerCase();
    let selectedAreaKey = "";
    
    if (lowerArea.includes("mont kiara") || lowerArea.includes("kiara")) {
      selectedAreaKey = "mont kiara";
    } else if (lowerArea.includes("bangsar")) {
      selectedAreaKey = "bangsar";
    } else if (lowerArea.includes("klcc") || lowerArea.includes("city centre") || lowerArea.includes("kuala lumpur city")) {
      selectedAreaKey = "klcc";
    } else if (lowerArea.includes("petaling jaya") || lowerArea.includes("pj")) {
      selectedAreaKey = "petaling jaya";
    } else if (lowerArea.includes("subang")) {
      selectedAreaKey = "subang jaya";
    }

    const ranges: Record<string, MarketRange> = selectedAreaKey ? MARKET_RANGES[selectedAreaKey] : DEFAULT_RANGES;
    const anomalies: Anomaly[] = [];
    let score = 100;

    listings.forEach(listing => {
      const segment = listing.bedrooms;
      const range = ranges[segment] || DEFAULT_RANGES[segment] || { min: 800, max: 6000 };
      const price = listing.price_monthly;
      const size = listing.size_sqft;

      // Check price anomalies
      if (price < range.min * 0.5) {
        anomalies.push({
          id: listing.id,
          title: listing.title,
          property_name: listing.property_name,
          bedrooms: segment,
          price_monthly: price,
          size_sqft: size,
          type: "extreme_low",
          expectedRange: range,
          explanation: `Renting at RM ${price.toLocaleString()} is significantly below the extreme 50% threshold of expected rates (typical minimum: RM ${range.min.toLocaleString()}). Check if it is a single room rent rather than a whole unit.`
        });
        score -= 8;
      } else if (price > range.max * 2.0) {
        anomalies.push({
          id: listing.id,
          title: listing.title,
          property_name: listing.property_name,
          bedrooms: segment,
          price_monthly: price,
          size_sqft: size,
          type: "extreme_high",
          expectedRange: range,
          explanation: `Renting at RM ${price.toLocaleString()} is extremely high (more than 200% of typical market ceiling: RM ${range.max.toLocaleString()}). This represents a highly inflated or ultra-luxury outlier.`
        });
        score -= 8;
      } else if (price < range.min) {
        anomalies.push({
          id: listing.id,
          title: listing.title,
          property_name: listing.property_name,
          bedrooms: segment,
          price_monthly: price,
          size_sqft: size,
          type: "slight_low",
          expectedRange: range,
          explanation: `Renting at RM ${price.toLocaleString()} is slightly below typical market minimums (RM ${range.min.toLocaleString()}). Might represent a high-value deal.`
        });
        score -= 3;
      } else if (price > range.max) {
        anomalies.push({
          id: listing.id,
          title: listing.title,
          property_name: listing.property_name,
          bedrooms: segment,
          price_monthly: price,
          size_sqft: size,
          type: "slight_high",
          expectedRange: range,
          explanation: `Renting at RM ${price.toLocaleString()} is slightly above standard market ranges (typical max: RM ${range.max.toLocaleString()}). Fits premium tier properties.`
        });
        score -= 3;
      }

      // Check size anomalies (sqft boundaries)
      let minSize = 250;
      let maxSize = 5000;
      if (segment === "Studio") { minSize = 200; maxSize = 1100; }
      else if (segment === "1 Bedroom") { minSize = 300; maxSize = 1400; }
      else if (segment === "2 Bedrooms") { minSize = 450; maxSize = 2200; }
      else if (segment === "3 Bedrooms") { minSize = 650; maxSize = 3500; }
      else if (segment === "4 Bedrooms") { minSize = 850; maxSize = 5000; }
      else { minSize = 1000; maxSize = 10000; }

      if (size > 0 && (size < minSize || size > maxSize)) {
        anomalies.push({
          id: listing.id,
          title: listing.title,
          property_name: listing.property_name,
          bedrooms: segment,
          price_monthly: price,
          size_sqft: size,
          type: "suspicious_size",
          expectedRange: { min: minSize, max: maxSize },
          explanation: `Listed unit size of ${size.toLocaleString()} sqft lies outside normal ranges for ${segment} units (typically ${minSize} - ${maxSize} sqft).`
        });
        score -= 2;
      }
    });

    score = Math.max(10, Math.min(100, score));

    let grade = "A";
    let gradeBadgeColor = "bg-emerald-50 text-emerald-700 border-emerald-200";
    let scoreBarColor = "bg-emerald-600";
    let feedback = "";

    if (score >= 90) {
      grade = "A";
      gradeBadgeColor = "bg-emerald-50 text-emerald-700 border-emerald-200";
      scoreBarColor = "bg-emerald-600";
      feedback = "Excellent! The scraped listings heavily align with typical Speedhome market parameters. The data is highly representative and reliable for decision making.";
    } else if (score >= 75) {
      grade = "B";
      gradeBadgeColor = "bg-blue-50 text-blue-700 border-blue-200";
      scoreBarColor = "bg-blue-600";
      feedback = "Good quality. The dataset is solid and reflects normal prices with only minor isolated outliers or minor listing size differences.";
    } else if (score >= 60) {
      grade = "C";
      gradeBadgeColor = "bg-amber-50 text-amber-700 border-amber-200";
      scoreBarColor = "bg-amber-500";
      feedback = "Moderate quality. We found multiple pricing deviations or size irregularities. Some listings could be single-room advertisements or exclusive premium penthouse suites.";
    } else {
      grade = "D";
      gradeBadgeColor = "bg-rose-50 text-rose-700 border-rose-200";
      scoreBarColor = "bg-rose-600";
      feedback = "Alert / Low consistency. There are high amounts of anomalies, possibly due to mixed listing types (e.g. rooms rented as whole apartments, extreme high-end properties, or scrape parser adjustments).";
    }

    const marketFriendlyName = selectedAreaKey
      ? selectedAreaKey.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
      : "General Malaysia Market";

    return {
      score,
      grade,
      gradeBadgeColor,
      scoreBarColor,
      feedback,
      anomalies,
      marketRanges: ranges,
      marketName: marketFriendlyName
    };
  }, [listings, areaName]);

  // Market Intelligence metrics
  const marketIntel = useMemo(() => {
    // Price Tier based on median
    const median = overall.median;
    let tierLabel: string;
    let tierColor: string;
    let tierBg: string;
    let tierDot: string;
    if (median < 1500) {
      tierLabel = "Budget"; tierColor = "text-emerald-700"; tierBg = "bg-emerald-50 border-emerald-200"; tierDot = "bg-emerald-500";
    } else if (median < 2500) {
      tierLabel = "Mid-Range"; tierColor = "text-blue-700"; tierBg = "bg-blue-50 border-blue-200"; tierDot = "bg-blue-500";
    } else if (median < 4500) {
      tierLabel = "Premium"; tierColor = "text-violet-700"; tierBg = "bg-violet-50 border-violet-200"; tierDot = "bg-violet-500";
    } else {
      tierLabel = "Luxury"; tierColor = "text-amber-700"; tierBg = "bg-amber-50 border-amber-200"; tierDot = "bg-amber-500";
    }

    // Avg RM/sqft
    const validSqft = listings.filter(l => l.size_sqft > 100 && l.price_monthly > 0);
    const avgRmPerSqft = validSqft.length > 0
      ? Math.round((validSqft.reduce((sum, l) => sum + l.price_monthly / l.size_sqft, 0) / validSqft.length) * 10) / 10
      : 0;

    // Price spread
    const prices = listings.map(l => l.price_monthly).filter(p => p > 0);
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

    // Negotiation gap: (avg - median) / median %
    const negGapPct = overall.median > 0
      ? Math.round(((overall.average - overall.median) / overall.median) * 100)
      : 0;
    let negGapLabel: string;
    let negGapColor: string;
    if (negGapPct > 20) {
      negGapLabel = "High outlier skew — negotiate below average"; negGapColor = "text-amber-600";
    } else if (negGapPct > 10) {
      negGapLabel = "Moderate skew — target median, not average"; negGapColor = "text-blue-600";
    } else if (negGapPct >= 0) {
      negGapLabel = "Stable market — tight negotiation room"; negGapColor = "text-emerald-600";
    } else {
      negGapLabel = "Median above average — premium units dominate"; negGapColor = "text-violet-600";
    }

    // Bedroom distribution
    const segmentOrder = ["Studio", "1 Bedroom", "2 Bedrooms", "3 Bedrooms", "4 Bedrooms", "5+ Bedrooms"];
    const bedroomDist = segmentOrder.map(seg => {
      const count = listings.filter(l => l.bedrooms === seg).length;
      const pct = listings.length > 0 ? Math.round((count / listings.length) * 100) : 0;
      return { seg, count, pct };
    }).filter(d => d.count > 0);

    // Best Value Picks — lowest RM/sqft
    const bestValuePicks = validSqft
      .map(l => ({ ...l, rmPerSqft: Math.round((l.price_monthly / l.size_sqft) * 10) / 10 }))
      .sort((a, b) => a.rmPerSqft - b.rmPerSqft)
      .slice(0, 3);

    return { tierLabel, tierColor, tierBg, tierDot, avgRmPerSqft, minPrice, maxPrice, negGapPct, negGapLabel, negGapColor, bedroomDist, bestValuePicks };
  }, [listings, overall]);

  return (
    <div className="flex flex-col gap-8" id="stats-dashboard-panel">
      
      {/* 1. Overall Summary Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Total Units */}
        <div className="bg-white border border-slate-200 p-5 rounded-xl flex items-start gap-4 shadow-sm">
          <div className="p-3 bg-blue-50 rounded-lg text-blue-600 border border-blue-100">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Unit Count</p>
            <h4 className="text-2xl font-bold text-slate-800 mt-1">{overall.count}</h4>
            <p className="text-[10px] text-slate-400 mt-0.5">Found in public records</p>
          </div>
        </div>

        {/* Average Price */}
        <div className="bg-white border border-slate-200 p-5 rounded-xl flex items-start gap-4 shadow-sm">
          <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600 border border-emerald-100">
            <Coins className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Average Rent</p>
            <h4 className="text-2xl font-bold text-slate-800 mt-1">RM {overall.average.toLocaleString()}</h4>
            <p className="text-[10px] text-slate-400 mt-0.5">Mean price monthly</p>
          </div>
        </div>

        {/* Median Price */}
        <div className="bg-white border border-slate-200 p-5 rounded-xl flex items-start gap-4 shadow-sm">
          <div className="p-3 bg-sky-50 rounded-lg text-sky-600 border border-sky-100">
            <Scale className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Median Rent</p>
            <h4 className="text-2xl font-bold text-slate-800 mt-1">RM {overall.median.toLocaleString()}</h4>
            <p className="text-[10px] text-slate-400 mt-0.5">Mid-market centerpoint</p>
          </div>
        </div>

        {/* Mode Price */}
        <div className="bg-white border border-slate-200 p-5 rounded-xl flex items-start gap-4 shadow-sm">
          <div className="p-3 bg-amber-50 rounded-lg text-amber-600 border border-amber-100">
            <Home className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mode Rent</p>
            <h4 className="text-2xl font-bold text-slate-800 mt-1">RM {overall.mode.toLocaleString()}</h4>
            <p className="text-[10px] text-slate-400 mt-0.5">Most common segment</p>
          </div>
        </div>

        {/* Fair Price Estimate */}
        <div className="bg-white border border-slate-200 p-5 rounded-xl flex items-start gap-4 shadow-sm ring-1 ring-blue-500/10">
          <div className="p-3 bg-blue-50 rounded-lg text-blue-600 border border-blue-100">
            <CheckSquare className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider flex items-center gap-1">
              Fair Price <span className="text-slate-400 cursor-help" title="Estimated center of the market (Median-aligned) representing a fair and competitive monthly rent rate for tenant negotiations.">?</span>
            </p>
            <h4 className="text-2xl font-bold text-blue-600 mt-1">RM {overall.fairPrice.toLocaleString()}</h4>
            <p className="text-[10px] text-slate-400 mt-0.5">Fair contract estimate</p>
          </div>
        </div>

        {/* Average Size */}
        <div className="bg-white border border-slate-200 p-5 rounded-xl flex items-start gap-4 shadow-sm">
          <div className="p-3 bg-purple-50 rounded-lg text-purple-600 border border-purple-100">
            <Maximize className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Average Size</p>
            <h4 className="text-2xl font-bold text-slate-800 mt-1">{overall.avgSize} <span className="text-xs font-normal">sqft</span></h4>
            <p className="text-[10px] text-slate-400 mt-0.5">Average floor area</p>
          </div>
        </div>
      </div>
      {/* END metric cards */}

      {/* 2. Market Intelligence Summary */}
      <div className="flex flex-col gap-4" id="market-intelligence-panel">
        {/* Section header + Price Tier badge */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-blue-600" />
            Market Intelligence
          </h3>
          <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${marketIntel.tierBg} ${marketIntel.tierColor}`}>
            <span className={`h-2 w-2 rounded-full ${marketIntel.tierDot}`} />
            {areaName} — {marketIntel.tierLabel} Market
          </span>
        </div>

        {/* 4 Quick Insight Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Price Tier */}
          <div className={`p-5 rounded-xl border flex flex-col gap-2 shadow-sm ${marketIntel.tierBg}`}>
            <p className={`text-[10px] font-bold uppercase tracking-wider ${marketIntel.tierColor}`}>Price Tier</p>
            <h4 className={`text-2xl font-extrabold ${marketIntel.tierColor}`}>{marketIntel.tierLabel}</h4>
            <p className="text-[10px] text-slate-500 mt-auto">Median RM {overall.median.toLocaleString()}/mo</p>
          </div>

          {/* RM / sqft */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col gap-2 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Avg RM / sqft</p>
            <h4 className="text-2xl font-extrabold text-orange-500">
              {marketIntel.avgRmPerSqft > 0 ? `RM ${marketIntel.avgRmPerSqft}` : "—"}
            </h4>
            <p className="text-[10px] text-slate-400 mt-auto">Price-per-size efficiency</p>
          </div>

          {/* Price Spread */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col gap-3 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Price Spread</p>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm font-bold text-emerald-600 font-mono">RM {marketIntel.minPrice.toLocaleString()}</span>
              <span className="text-slate-300 text-xs">→</span>
              <span className="text-sm font-bold text-rose-500 font-mono">RM {marketIntel.maxPrice.toLocaleString()}</span>
            </div>
            <div className="w-full h-1.5 bg-gradient-to-r from-emerald-400 via-amber-300 to-rose-400 rounded-full" />
            <p className="text-[10px] text-slate-400">Market width range</p>
          </div>

          {/* Negotiation Gap */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col gap-2 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Negotiation Gap</p>
            <h4 className={`text-2xl font-extrabold ${marketIntel.negGapColor}`}>
              {marketIntel.negGapPct > 0 ? "+" : ""}{marketIntel.negGapPct}%
            </h4>
            <p className={`text-[10px] font-medium mt-auto ${marketIntel.negGapColor}`}>{marketIntel.negGapLabel}</p>
          </div>
        </div>

        {/* Bedroom Distribution + Best Value Picks */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Bedroom Supply Distribution */}
          <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm flex flex-col gap-4">
            <div>
              <h4 className="text-sm font-bold text-slate-800">Supply Distribution by Bedroom</h4>
              <p className="text-xs text-slate-400 mt-0.5">How the available units are distributed</p>
            </div>
            <div className="flex flex-col gap-3">
              {marketIntel.bedroomDist.map((d, i) => {
                const barColors = ["bg-blue-500", "bg-emerald-500", "bg-violet-500", "bg-amber-500", "bg-rose-500", "bg-sky-500"];
                const textColors = ["text-blue-600", "text-emerald-600", "text-violet-600", "text-amber-600", "text-rose-600", "text-sky-600"];
                return (
                  <div key={d.seg} className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-slate-600 w-24 shrink-0">{d.seg}</span>
                    <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${barColors[i % barColors.length]}`}
                        style={{ width: `${d.pct}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono w-12 text-right shrink-0">{d.count} unit</span>
                    <span className={`text-xs font-bold w-8 text-right shrink-0 ${textColors[i % textColors.length]}`}>{d.pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Best Value Picks */}
          <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm flex flex-col gap-4">
            <div>
              <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-amber-500" />
                Best Value Picks
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">Lowest RM/sqft — best space for your money</p>
            </div>
            <div className="flex flex-col gap-2">
              {marketIntel.bestValuePicks.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No listings with size data available.</p>
              ) : (
                marketIntel.bestValuePicks.map((l, i) => (
                  <div
                    key={l.id}
                    className={`flex items-center justify-between p-3 rounded-lg border text-xs gap-3 ${i === 0 ? "bg-amber-50 border-amber-200 ring-1 ring-amber-300/40" : "bg-slate-50 border-slate-200"}`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-extrabold shrink-0 ${i === 0 ? "bg-amber-400 text-white" : "bg-slate-200 text-slate-600"}`}>
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 truncate">{l.property_name}</p>
                        <p className="text-slate-400">{l.bedrooms} · {l.size_sqft.toLocaleString()} sqft</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-slate-800">RM {l.price_monthly.toLocaleString()}</p>
                      <p className={`font-bold ${i === 0 ? "text-amber-600" : "text-slate-500"}`}>RM {l.rmPerSqft}/sqft</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* NEW: Data Quality Index & Market Comparison Section */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden" id="dqi-panel">
        <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-blue-600" />
              Scraped Data Quality Index (DQI)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Assessing consistency and detecting anomalies against known market benchmarks in <strong className="text-slate-700">{dqi.marketName}</strong>.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono">Matched Context:</span>
            <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 font-mono">
              {dqi.marketName}
            </span>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* DQI Main Score Column */}
          <div className="lg:col-span-4 flex flex-col items-center justify-center p-5 bg-slate-50/50 rounded-xl border border-slate-200/60 text-center">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Quality Grade</span>
            
            <div className={`h-20 w-20 flex items-center justify-center rounded-full text-4xl font-extrabold border-2 shadow-sm ${dqi.gradeBadgeColor}`}>
              {dqi.grade}
            </div>

            <div className="mt-4 w-full">
              <div className="flex justify-between text-xs font-semibold text-slate-500 mb-1">
                <span>DQI Trust Score</span>
                <span className="font-mono">{dqi.score}/100</span>
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${dqi.scoreBarColor}`} style={{ width: `${dqi.score}%` }} />
              </div>
            </div>

            <p className="text-xs text-slate-600 mt-4 leading-relaxed font-medium">
              {dqi.feedback}
            </p>
          </div>

          {/* Known Market Ranges Column */}
          <div className="lg:col-span-8 flex flex-col justify-between">
            <div>
              <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 mb-3">
                <Award className="h-4.5 w-4.5 text-blue-600" />
                Baseline Market Price Boundaries for {dqi.marketName}
              </h4>
              <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                Known average monthly rental ranges (RM) derived from Speedhome historical metrics. Listings fall outside these sectors are flagged as potential outliers.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Object.entries(dqi.marketRanges).map(([segment, r]) => {
                  const range = r as MarketRange;
                  // Check if this segment exists in our active scraped data
                  const segmentExists = segments.some(s => s.segment === segment);
                  return (
                    <div 
                      key={segment} 
                      className={`p-3 rounded-lg border text-xs flex flex-col gap-1 transition-all ${
                        segmentExists 
                          ? "bg-blue-50/20 border-blue-100 ring-1 ring-blue-500/5" 
                          : "bg-slate-50/50 border-slate-100 opacity-65"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-700">{segment}</span>
                        {segmentExists && (
                          <span className="h-1.5 w-1.5 rounded-full bg-blue-500" title="Active in scraped data" />
                        )}
                      </div>
                      <span className="font-mono text-slate-500 mt-1">
                        RM {range.min.toLocaleString()} - {range.max.toLocaleString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <AlertTriangle className="h-4.5 w-4.5 text-amber-500 shrink-0" />
                <span>
                  Detected <strong>{dqi.anomalies.length}</strong> outliers / potential anomalies in the dataset.
                </span>
              </div>

              <button
                type="button"
                onClick={() => setShowAnomalies(!showAnomalies)}
                className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer shrink-0"
              >
                <span>{showAnomalies ? "Hide Details" : "View Anomaly Report"}</span>
                {showAnomalies ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Collapsible Detailed Anomaly Report */}
        {showAnomalies && (
          <div className="bg-slate-50 border-t border-slate-200 p-5 animate-fadeIn">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
              Identified Anomaly & Outlier Registry ({dqi.anomalies.length})
            </h4>

            {dqi.anomalies.length === 0 ? (
              <div className="bg-white border border-slate-200 p-6 rounded-lg text-center text-xs text-slate-500 flex flex-col items-center gap-2">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                <p className="font-semibold text-slate-700">Perfect Alignment Detected!</p>
                <p>Not a single price or sizing outlier was found. The crawled Speedhome list perfectly fits the market baseline.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {dqi.anomalies.map((anomaly, index) => {
                  let typeLabel = "Slight Deviation";
                  let badgeStyle = "bg-amber-100 text-amber-800 border-amber-200";

                  if (anomaly.type === "extreme_low") {
                    typeLabel = "Extreme Low Outlier";
                    badgeStyle = "bg-rose-100 text-rose-800 border-rose-200";
                  } else if (anomaly.type === "extreme_high") {
                    typeLabel = "Extreme High Outlier";
                    badgeStyle = "bg-rose-100 text-rose-800 border-rose-200";
                  } else if (anomaly.type === "suspicious_size") {
                    typeLabel = "Unusual Square Footage";
                    badgeStyle = "bg-purple-100 text-purple-800 border-purple-200";
                  } else if (anomaly.type === "slight_low") {
                    typeLabel = "Highly Competitive Deal";
                    badgeStyle = "bg-emerald-100 text-emerald-800 border-emerald-200";
                  } else if (anomaly.type === "slight_high") {
                    typeLabel = "Premium Class Unit";
                    badgeStyle = "bg-blue-100 text-blue-800 border-blue-200";
                  }

                  return (
                    <div key={`${anomaly.id}-${index}`} className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="font-bold text-slate-800 text-sm">
                            {anomaly.property_name}
                          </span>
                          <span className="text-xs text-slate-400">({anomaly.bedrooms})</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${badgeStyle}`}>
                            {typeLabel}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          {anomaly.explanation}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1 font-mono">
                          Listing: "{anomaly.title}"
                        </p>
                      </div>

                      <div className="flex items-center gap-6 md:border-l md:border-slate-100 md:pl-6 shrink-0 font-mono text-right">
                        <div>
                          <span className="text-[9px] text-slate-400 block uppercase font-bold tracking-wider">Price</span>
                          <span className="text-sm font-bold text-slate-800">RM {anomaly.price_monthly.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 block uppercase font-bold tracking-wider">Size</span>
                          <span className="text-sm font-semibold text-slate-700">{anomaly.size_sqft > 0 ? `${anomaly.size_sqft} sqft` : "-"}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. Rent Types Comparison Section (Daily, Monthly, Yearly) */}
      <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm">
        <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-4">
          Tenancy Type Comparative Analytics (Harian, Bulanan, Tahunan)
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Daily Rate (Harian) */}
          <div className="bg-slate-50/50 p-5 rounded-lg border border-slate-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-sky-100 text-sky-700 rounded-full border border-sky-200">
                  Harian (Daily Est.)
                </span>
                <span className="text-xs text-slate-400">Short-stay Premium</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Short-term stay rate derived from standard Malaysian short-stay premiums (+50% premium over base monthly rates) for tourist/business traveller comparison.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100">
              <span className="text-[10px] text-slate-400 block">Average Estimate</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-3xl font-extrabold text-sky-600">RM {Math.round((overall.average / 30) * 1.5)}</span>
                <span className="text-xs text-slate-500">/day</span>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-xs text-amber-800 bg-amber-50 border border-amber-200 p-2.5 rounded">
                <Info className="h-4 w-4 shrink-0" />
                <span>
                  Speedhome does not offer direct daily rentals. Daily rates are estimated strictly for comparison.
                </span>
              </div>
            </div>
          </div>

          {/* Monthly Rate (Bulanan) */}
          <div className="bg-slate-50/50 p-5 rounded-lg border border-slate-200 flex flex-col justify-between ring-1 ring-emerald-500/10 shadow-sm bg-emerald-50/5">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 rounded-full border border-emerald-200">
                  Bulanan (Monthly Active)
                </span>
                <span className="text-xs text-slate-400">Primary Rental Mode</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                The standard Speedhome rental contract structure. Zero-deposit option applies, and prices represent active real-time listings on the platform.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100">
              <span className="text-[10px] text-slate-400 block">Average Platform Price</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-3xl font-extrabold text-emerald-600">RM {overall.average.toLocaleString()}</span>
                <span className="text-xs text-slate-500">/month</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-3 italic">
                * Zero Deposit option available for qualifying tenants.
              </p>
            </div>
          </div>

          {/* Yearly Rate (Tahunan) */}
          <div className="bg-slate-50/50 p-5 rounded-lg border border-slate-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700 rounded-full border border-blue-200">
                  Tahunan (Yearly Contract)
                </span>
                <span className="text-xs text-slate-400">12-Month Commitment</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Standard long-term lease contract values. Assumes a locked 12-month tenure with tenant background screening and contract execution.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100">
              <span className="text-[10px] text-slate-400 block">Average Annual Total</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-3xl font-extrabold text-blue-600">RM {(overall.average * 12).toLocaleString()}</span>
                <span className="text-xs text-slate-500">/year</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-3">
                * Fully backed by Speedhome Smart Tenancy agreement.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Segment Pricing Table (Studio, 1BR, 2BR, 3BR, 4BR+) */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-200 bg-slate-50/50">
          <h3 className="text-base font-bold text-slate-850 flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-blue-600" />
            Pricing Segmentation by Bedroom Category
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Aggregated pricing stats grouped by unit segments in {areaName}
          </p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-bold uppercase">
                <th className="py-3 px-6">Unit Type</th>
                <th className="py-3 px-6 text-center">Units Analyzed</th>
                <th className="py-3 px-6 text-right">Avg Rent</th>
                <th className="py-3 px-6 text-right">Median Rent</th>
                <th className="py-3 px-6 text-right">Mode Rent (rounded)</th>
                <th className="py-3 px-6 text-right text-blue-600">Fair Price Est.</th>
                <th className="py-3 px-6 text-right">Avg Size (sqft)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {segments.map((seg) => (
                <tr key={seg.segment} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3.5 px-6 font-bold text-slate-800">
                    {seg.segment}
                  </td>
                  <td className="py-3.5 px-6 text-center font-medium">
                    <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                      {seg.count} {seg.count === 1 ? 'unit' : 'units'}
                    </span>
                  </td>
                  <td className="py-3.5 px-6 text-right font-semibold text-emerald-600 font-mono">
                    RM {seg.average.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-6 text-right font-mono text-slate-600">
                    RM {seg.median.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-6 text-right text-slate-500 font-mono">
                    RM {seg.mode.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-6 text-right font-bold text-blue-700 bg-blue-50/30 border-x border-blue-100 font-mono">
                    RM {seg.fairPrice.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-6 text-right font-mono text-slate-600">
                    {seg.avgSize > 0 ? `${seg.avgSize.toLocaleString()} sqft` : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
