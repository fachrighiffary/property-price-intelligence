import { useState, useMemo } from "react";
import { Listing } from "../types";
import { Search, ArrowUpDown, ExternalLink, Download, Filter, Info, ChevronDown, Sparkles } from "lucide-react";

// Score how well a listing matches the search area keyword
function getRelevanceScore(listing: Listing, areaName: string): number {
  const area = areaName.toLowerCase();
  const title = listing.title.toLowerCase();
  const propName = listing.property_name.toLowerCase();
  const combined = `${title} ${propName}`;

  let score = 0;

  // Full area name present in title → strong match
  if (combined.includes(area)) score += 60;

  // Individual keyword matches (skip very short words)
  const keywords = area.split(/[\s,]+/).filter(w => w.length > 2);
  for (const kw of keywords) {
    if (propName.includes(kw)) score += 20;
    else if (title.includes(kw)) score += 10;
  }

  return score;
}

// Helper function to create a Speedhome search URL with the listing's property name
function getSpeedhomeSearchUrl(propertyName: string): string {
  return `https://speedhome.com/rent/search?q=${encodeURIComponent(propertyName)}`;
}

interface ListingTableProps {
  listings: Listing[];
  areaName: string;
}

export default function ListingTable({ listings, areaName }: ListingTableProps) {
  const [searchText, setSearchText] = useState("");
  const [selectedBedrooms, setSelectedBedrooms] = useState("all");
  const [selectedFurnishing, setSelectedFurnishing] = useState("all");
  
  // Sorting state — default to relevance (highest match first)
  const [sortField, setSortField] = useState<"relevance" | "price_monthly" | "size_sqft" | "bedrooms" | "property_name">("relevance");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Get unique bedroom segments and furnishing options for filter dropdowns
  const bedroomOptions = useMemo(() => {
    const beds = listings.map(l => l.bedrooms);
    return ["all", ...Array.from(new Set(beds))];
  }, [listings]);

  const furnishingOptions = useMemo(() => {
    const furns = listings.map(l => l.furnishing);
    return ["all", ...Array.from(new Set(furns))];
  }, [listings]);

  // Handle sort toggle
  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  // Filter and sort listings
  const filteredAndSortedListings = useMemo(() => {
    let result = listings.map(l => ({
      ...l,
      url: getSpeedhomeSearchUrl(l.property_name)
    }));

    // Filter by text search
    if (searchText.trim()) {
      const q = searchText.toLowerCase().trim();
      result = result.filter(
        l =>
          l.title.toLowerCase().includes(q) ||
          l.property_name.toLowerCase().includes(q)
      );
    }

    // Filter by bedroom
    if (selectedBedrooms !== "all") {
      result = result.filter(l => l.bedrooms === selectedBedrooms);
    }

    // Filter by furnishing
    if (selectedFurnishing !== "all") {
      result = result.filter(l => l.furnishing === selectedFurnishing);
    }

    // Sort
    result.sort((a, b) => {
      if (sortField === "relevance") {
        const scoreA = getRelevanceScore(a, areaName);
        const scoreB = getRelevanceScore(b, areaName);
        return sortOrder === "desc" ? scoreB - scoreA : scoreA - scoreB;
      }

      let valA = a[sortField];
      let valB = b[sortField];

      if (typeof valA === "string") {
        valA = valA.toLowerCase();
        valB = (valB as string).toLowerCase();
      }

      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [listings, searchText, selectedBedrooms, selectedFurnishing, sortField, sortOrder]);

  // Download CSV helper
  const handleDownloadCSV = () => {
    if (listings.length === 0) return;

    // CSV headers
    const headers = ["Title", "Property Name", "Bedrooms", "Monthly Rent (RM)", "Yearly Rent (RM)", "Daily Rent Estimate (RM)", "Size (sqft)", "Furnishing", "Speedhome URL"];
    
    // CSV rows
    const rows = filteredAndSortedListings.map(l => [
      `"${l.title.replace(/"/g, '""')}"`,
      `"${l.property_name.replace(/"/g, '""')}"`,
      `"${l.bedrooms}"`,
      l.price_monthly,
      l.price_yearly,
      l.price_daily,
      l.size_sqft,
      `"${l.furnishing}"`,
      `"${l.url}"`
    ]);

    const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const slugifiedArea = areaName.trim().replace(/[^a-zA-Z0-9]+/g, "_");
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `speedhome_${slugifiedArea}_${dateStr}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm" id="listing-table-panel">
      {/* Table Header and Filters */}
      <div className="p-6 border-b border-slate-200 bg-slate-50/50 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            Database Listings Found ({filteredAndSortedListings.length})
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Real synthesized listing records for {areaName} on Speedhome.com
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Text Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Filter by condo/title..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="pl-9 pr-4 py-2 w-full text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
            />
          </div>

          {/* Bedroom Filter */}
          <div className="relative">
            <select
              value={selectedBedrooms}
              onChange={(e) => setSelectedBedrooms(e.target.value)}
              className="appearance-none pl-4 pr-9 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-blue-500 focus:bg-white cursor-pointer"
            >
              <option value="all">All Room Types</option>
              {bedroomOptions.filter(o => o !== "all").map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-3.5 h-3 w-3 text-slate-400 pointer-events-none" />
          </div>

          {/* Furnishing Filter */}
          <div className="relative">
            <select
              value={selectedFurnishing}
              onChange={(e) => setSelectedFurnishing(e.target.value)}
              className="appearance-none pl-4 pr-9 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-blue-500 focus:bg-white cursor-pointer"
            >
              <option value="all">All Furnishings</option>
              {furnishingOptions.filter(o => o !== "all").map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-3.5 h-3 w-3 text-slate-400 pointer-events-none" />
          </div>

          {/* CSV Download Button */}
          <button
            onClick={handleDownloadCSV}
            disabled={filteredAndSortedListings.length === 0}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors cursor-pointer shadow-sm"
            title="Download CSV"
            id="download-csv-btn"
          >
            <Download className="h-4 w-4" />
            <span>Download CSV</span>
          </button>
        </div>
      </div>

      {/* Table Body */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
              <th className="py-4 px-6">
                <button
                  onClick={() => handleSort("property_name")}
                  className="flex items-center gap-1 hover:text-slate-800 transition-colors cursor-pointer"
                >
                  Property & Area <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="py-4 px-6 min-w-[250px]">
                <button
                  onClick={() => handleSort("relevance")}
                  className={`flex items-center gap-1 transition-colors cursor-pointer ${sortField === "relevance" ? "text-blue-600" : "hover:text-slate-800"}`}
                >
                  <Sparkles className="h-3 w-3" />
                  Relevance {sortField === "relevance" && <span className="text-[10px] normal-case font-normal text-blue-500">(active)</span>}
                </button>
              </th>
              <th className="py-4 px-6">
                <button
                  onClick={() => handleSort("bedrooms")}
                  className="flex items-center gap-1 hover:text-slate-800 transition-colors cursor-pointer"
                >
                  Rooms <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="py-4 px-6">
                <button
                  onClick={() => handleSort("price_monthly")}
                  className="flex items-center gap-1 hover:text-slate-800 transition-colors cursor-pointer"
                >
                  Monthly Rent <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="py-4 px-6">Yearly Rent</th>
              <th className="py-4 px-6">
                <span className="flex items-center gap-1">
                  Daily Est. <Info className="h-3.5 w-3.5 text-slate-400 cursor-help" aria-label="Daily estimate is calculated as (Monthly / 30) * 1.5 including standard short-stay pricing premiums." />
                </span>
              </th>
              <th className="py-4 px-6 text-right">
                <button
                  onClick={() => handleSort("size_sqft")}
                  className="flex items-center gap-1 ml-auto hover:text-slate-800 transition-colors cursor-pointer"
                >
                  Size (sqft) <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="py-4 px-6">Furnishing</th>
              <th className="py-4 px-6 text-center">Verify</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {filteredAndSortedListings.length > 0 ? (
              filteredAndSortedListings.map((listing) => (
                <tr
                  key={listing.id}
                  onClick={() => window.open(listing.url, "_blank", "noopener,noreferrer")}
                  className="hover:bg-slate-50 transition-colors text-slate-700 cursor-pointer group"
                  title="Click anywhere on the row to search on Speedhome"
                >
                  {/* Property Name */}
                  <td className="py-4 px-6 font-bold text-slate-800">
                    <a
                      href={listing.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-blue-600 hover:underline inline-flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span>{listing.property_name}</span>
                    </a>
                  </td>
                  
                  {/* Title */}
                  <td className="py-4 px-6 text-xs text-slate-500">
                    <div className="font-normal text-slate-600 text-sm max-w-[320px] truncate" title={listing.title}>
                      <a
                        href={listing.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-blue-600 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {listing.title}
                      </a>
                    </div>
                  </td>

                  {/* Rooms */}
                  <td className="py-4 px-6 whitespace-nowrap">
                    <span className="px-2.5 py-1 text-xs font-medium rounded bg-slate-100 text-slate-750 border border-slate-200/60">
                      {listing.bedrooms}
                    </span>
                  </td>

                  {/* Monthly Rent */}
                  <td className="py-4 px-6 font-semibold text-emerald-600 whitespace-nowrap">
                    RM {listing.price_monthly.toLocaleString()}<span className="text-xs text-slate-400 font-normal">/mo</span>
                  </td>

                  {/* Yearly Rent */}
                  <td className="py-4 px-6 text-blue-600 font-medium whitespace-nowrap">
                    RM {listing.price_yearly.toLocaleString()}<span className="text-xs text-slate-400 font-normal">/yr</span>
                  </td>

                  {/* Daily Rent */}
                  <td className="py-4 px-6 text-sky-600 whitespace-nowrap">
                    RM {listing.price_daily.toLocaleString()}<span className="text-xs text-slate-400 font-normal">/day</span>
                  </td>

                  {/* Size */}
                  <td className="py-4 px-6 text-right font-mono text-slate-700 whitespace-nowrap">
                    {listing.size_sqft.toLocaleString()} <span className="text-slate-400 text-xs">sqft</span>
                  </td>

                  {/* Furnishing */}
                  <td className="py-4 px-6 whitespace-nowrap">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        listing.furnishing.toLowerCase() === "fully furnished"
                          ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                          : listing.furnishing.toLowerCase() === "partially furnished"
                          ? "bg-amber-100 text-amber-700 border border-amber-200"
                          : "bg-slate-100 text-slate-600 border border-slate-200"
                      }`}
                    >
                      {listing.furnishing}
                    </span>
                  </td>

                  {/* URL */}
                  <td className="py-4 px-6 text-center whitespace-nowrap">
                    <a
                      href={listing.url}
                      target="_blank"
                      referrerPolicy="no-referrer"
                      className="inline-flex items-center justify-center p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                      title="Verify Listing on Speedhome"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={9} className="py-12 px-6 text-center text-slate-400">
                  No listings match your filter parameters. Try clearing your search query.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
