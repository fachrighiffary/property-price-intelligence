import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { load } from "cheerio";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const DEFAULT_PORT = 3000;
const START_PORT = Number(process.env.PORT) || DEFAULT_PORT;
const isPortExplicit = process.env.PORT !== undefined;

app.use(express.json());

// List of popular rental areas and apartments in Malaysia for autocomplete suggestions
const POPULAR_AREAS = [
  "Mont Kiara, Kuala Lumpur",
  "Seni Mont Kiara, Kuala Lumpur",
  "Residensi 22, Mont Kiara",
  "10 Mont Kiara, Kuala Lumpur",
  "11 Mont Kiara, Kuala Lumpur",
  "Gateway Kiaramas, Mont Kiara",
  "Kiaramas Ayuria, Mont Kiara",
  "Mont Kiara Pelangi, Kuala Lumpur",
  "Mont Kiara Pines, Kuala Lumpur",
  "Mont Kiara Palma, Kuala Lumpur",
  "Bangsar, Kuala Lumpur",
  "Nadi Bangsar, Kuala Lumpur",
  "Suasana Bangsar, Kuala Lumpur",
  "Serai Bangsar, Kuala Lumpur",
  "Bangsar Baru, Kuala Lumpur",
  "KLCC, Kuala Lumpur City Centre",
  "Platinum Suites, KLCC",
  "Binjai On The Park, KLCC",
  "Troika, KLCC",
  "Star Residences, KLCC",
  "Petaling Jaya, Selangor",
  "Ameera Residences, Petaling Jaya",
  "Five Stones, Petaling Jaya",
  "Jaya One, Petaling Jaya",
  "Subang Jaya, Selangor",
  "Subang Parkhomes, Subang Jaya",
  "Subang Olives, Subang Jaya",
  "Subang Avenue, Subang Jaya",
  "Empire Subang, Subang Jaya",
  "Damansara Heights, Kuala Lumpur",
  "Damansara Utama, Selangor",
  "Damansara Perdana, Selangor",
  "Cheras, Kuala Lumpur",
  "Ampang, Kuala Lumpur",
  "Bukit Bintang, Kuala Lumpur",
  "Kepong, Kuala Lumpur",
  "Puchong, Selangor",
  "Sunway, Selangor",
  "Sunway Geo Residences, Selangor",
  "Setapak, Kuala Lumpur",
  "Sentul, Kuala Lumpur",
  "Cyberjaya, Selangor",
  "Putrajaya, Wilayah Persekutuan",
  "Johor Bahru, Johor",
  "Penang (Georgetown)"
];

// Autocomplete endpoint
app.get("/api/suggestions", (req, res) => {
  const query = (req.query.q as string || "").toLowerCase().trim();
  if (!query) {
    return res.json([]);
  }
  
  const matches = POPULAR_AREAS.filter(area => 
    area.toLowerCase().includes(query)
  ).slice(0, 10);
  
  res.json(matches);
});

// Calculate statistics helper
function calculateStats(listings: any[]) {
  if (listings.length === 0) {
    return {
      count: 0,
      average: 0,
      median: 0,
      mode: 0,
      fairPrice: 0,
      avgSize: 0
    };
  }

  const prices = listings.map(l => l.price_monthly).sort((a, b) => a - b);
  const sizes = listings.map(l => l.size_sqft).filter(s => s > 0);

  // Average Price
  const sumPrice = prices.reduce((a, b) => a + b, 0);
  const average = Math.round(sumPrice / prices.length);

  // Median Price
  let median = 0;
  const mid = Math.floor(prices.length / 2);
  if (prices.length % 2 === 0) {
    median = Math.round((prices[mid - 1] + prices[mid]) / 2);
  } else {
    median = prices[mid];
  }

  // Mode Price
  const frequency: Record<number, number> = {};
  let maxFreq = 0;
  let mode = prices[0];
  
  prices.forEach(p => {
    // Group prices to the nearest 100 for a more meaningful mode in rental data
    const roundedPrice = Math.round(p / 100) * 100;
    frequency[roundedPrice] = (frequency[roundedPrice] || 0) + 1;
    if (frequency[roundedPrice] > maxFreq) {
      maxFreq = frequency[roundedPrice];
      mode = roundedPrice;
    }
  });

  // Average Size
  const sumSize = sizes.reduce((a, b) => a + b, 0);
  const avgSize = sizes.length > 0 ? Math.round(sumSize / sizes.length) : 0;

  // Fair Price - typically the median price in the local market, representing the most standard/representative rate
  const fairPrice = median;

  return {
    count: listings.length,
    average,
    median,
    mode,
    fairPrice,
    avgSize
  };
}

// Generate sample/fallback listings for when live scraping is unavailable
function generateSampleListings(area: string): any[] {
  const sampleData: Record<string, any[]> = {
    "mont-kiara": [
      // Premium buildings
      { title: "Mont Kiara Pelangi - 2BR Luxury Condo", property_name: "Mont Kiara Pelangi", url: "https://speedhome.com/rent/mont-kiara", size_sqft: 1100, price_monthly: 2800, bedrooms: "2 Bedrooms" },
      { title: "Mont Kiara Pelangi - 3BR Corner Unit", property_name: "Mont Kiara Pelangi", url: "https://speedhome.com/rent/mont-kiara", size_sqft: 1450, price_monthly: 3500, bedrooms: "3 Bedrooms" },
      { title: "Seni Mont Kiara - 3BR Luxury Suite", property_name: "Seni Mont Kiara", url: "https://speedhome.com/rent/mont-kiara", size_sqft: 1800, price_monthly: 4200, bedrooms: "3 Bedrooms" },
      { title: "Seni Mont Kiara - 2BR Modern", property_name: "Seni Mont Kiara", url: "https://speedhome.com/rent/mont-kiara", size_sqft: 1250, price_monthly: 3200, bedrooms: "2 Bedrooms" },
      { title: "10 Mont Kiara - 1BR Modern Apartment", property_name: "10 Mont Kiara", url: "https://speedhome.com/rent/mont-kiara", size_sqft: 850, price_monthly: 1900, bedrooms: "1 Bedroom" },
      { title: "10 Mont Kiara - 2BR Contemporary", property_name: "10 Mont Kiara", url: "https://speedhome.com/rent/mont-kiara", size_sqft: 1100, price_monthly: 2600, bedrooms: "2 Bedrooms" },
      { title: "Kiaramas Ayuria - 2BR Family Condo", property_name: "Kiaramas Ayuria", url: "https://speedhome.com/rent/mont-kiara", size_sqft: 1200, price_monthly: 2900, bedrooms: "2 Bedrooms" },
      { title: "Kiaramas Ayuria - 3BR Spacious Unit", property_name: "Kiaramas Ayuria", url: "https://speedhome.com/rent/mont-kiara", size_sqft: 1650, price_monthly: 3800, bedrooms: "3 Bedrooms" },
      { title: "Gateway Kiaramas - 1BR Studio", property_name: "Gateway Kiaramas", url: "https://speedhome.com/rent/mont-kiara", size_sqft: 700, price_monthly: 1600, bedrooms: "1 Bedroom" },
      { title: "Gateway Kiaramas - 2BR Standard", property_name: "Gateway Kiaramas", url: "https://speedhome.com/rent/mont-kiara", size_sqft: 950, price_monthly: 2200, bedrooms: "2 Bedrooms" },
      { title: "Mont Kiara Pines - 3BR Spacious", property_name: "Mont Kiara Pines", url: "https://speedhome.com/rent/mont-kiara", size_sqft: 2000, price_monthly: 4500, bedrooms: "3 Bedrooms" },
      { title: "Mont Kiara Pines - 2BR Penthouse", property_name: "Mont Kiara Pines", url: "https://speedhome.com/rent/mont-kiara", size_sqft: 1600, price_monthly: 3600, bedrooms: "2 Bedrooms" },
      { title: "Mont Kiara Palma - 1BR Compact", property_name: "Mont Kiara Palma", url: "https://speedhome.com/rent/mont-kiara", size_sqft: 750, price_monthly: 1700, bedrooms: "1 Bedroom" },
      { title: "Mont Kiara Palma - 2BR Modern", property_name: "Mont Kiara Palma", url: "https://speedhome.com/rent/mont-kiara", size_sqft: 1050, price_monthly: 2500, bedrooms: "2 Bedrooms" },
      { title: "11 Mont Kiara - 3BR Premium", property_name: "11 Mont Kiara", url: "https://speedhome.com/rent/mont-kiara", size_sqft: 1700, price_monthly: 3900, bedrooms: "3 Bedrooms" },
      { title: "11 Mont Kiara - 2BR Deluxe", property_name: "11 Mont Kiara", url: "https://speedhome.com/rent/mont-kiara", size_sqft: 1300, price_monthly: 3000, bedrooms: "2 Bedrooms" },
      { title: "Mont Kiara Vista - 1BR City View", property_name: "Mont Kiara Vista", url: "https://speedhome.com/rent/mont-kiara", size_sqft: 800, price_monthly: 1750, bedrooms: "1 Bedroom" },
      { title: "Mont Kiara Vista - 2BR Luxury", property_name: "Mont Kiara Vista", url: "https://speedhome.com/rent/mont-kiara", size_sqft: 1150, price_monthly: 2700, bedrooms: "2 Bedrooms" },
      { title: "Residensi 22 Mont Kiara - 2BR Furnished", property_name: "Residensi 22", url: "https://speedhome.com/rent/mont-kiara", size_sqft: 1100, price_monthly: 2650, bedrooms: "2 Bedrooms" },
      { title: "Residensi 22 Mont Kiara - 3BR Suite", property_name: "Residensi 22", url: "https://speedhome.com/rent/mont-kiara", size_sqft: 1550, price_monthly: 3700, bedrooms: "3 Bedrooms" },
      { title: "Centrepoint Residences - 2BR Modern", property_name: "Centrepoint Residences", url: "https://speedhome.com/rent/mont-kiara", size_sqft: 1000, price_monthly: 2400, bedrooms: "2 Bedrooms" },
      { title: "Centrepoint Residences - 1BR Studio", property_name: "Centrepoint Residences", url: "https://speedhome.com/rent/mont-kiara", size_sqft: 650, price_monthly: 1450, bedrooms: "1 Bedroom" },
    ],
    "bangsar": [
      { title: "Nadi Bangsar - 2BR Modern Condo", property_name: "Nadi Bangsar", url: "https://speedhome.com/rent/bangsar", size_sqft: 1050, price_monthly: 2300, bedrooms: "2 Bedrooms" },
      { title: "Nadi Bangsar - 1BR Contemporary", property_name: "Nadi Bangsar", url: "https://speedhome.com/rent/bangsar", size_sqft: 750, price_monthly: 1600, bedrooms: "1 Bedroom" },
      { title: "Suasana Bangsar - 3BR Luxury Apartment", property_name: "Suasana Bangsar", url: "https://speedhome.com/rent/bangsar", size_sqft: 1600, price_monthly: 3600, bedrooms: "3 Bedrooms" },
      { title: "Suasana Bangsar - 2BR Family Unit", property_name: "Suasana Bangsar", url: "https://speedhome.com/rent/bangsar", size_sqft: 1100, price_monthly: 2500, bedrooms: "2 Bedrooms" },
      { title: "Serai Bangsar - 1BR Cozy Apartment", property_name: "Serai Bangsar", url: "https://speedhome.com/rent/bangsar", size_sqft: 800, price_monthly: 1700, bedrooms: "1 Bedroom" },
      { title: "Serai Bangsar - 2BR Spacious", property_name: "Serai Bangsar", url: "https://speedhome.com/rent/bangsar", size_sqft: 1200, price_monthly: 2800, bedrooms: "2 Bedrooms" },
      { title: "Bangsar Baru Terrace - 2BR Modern", property_name: "Bangsar Baru", url: "https://speedhome.com/rent/bangsar", size_sqft: 1000, price_monthly: 2200, bedrooms: "2 Bedrooms" },
      { title: "Bangsar Baru High Rise - 3BR Suite", property_name: "Bangsar Baru", url: "https://speedhome.com/rent/bangsar", size_sqft: 1400, price_monthly: 3200, bedrooms: "3 Bedrooms" },
    ],
    "klcc": [
      { title: "Platinum Suites - 2BR City View", property_name: "Platinum Suites", url: "https://speedhome.com/rent/klcc", size_sqft: 1200, price_monthly: 3500, bedrooms: "2 Bedrooms" },
      { title: "Platinum Suites - 1BR Tower View", property_name: "Platinum Suites", url: "https://speedhome.com/rent/klcc", size_sqft: 850, price_monthly: 2400, bedrooms: "1 Bedroom" },
      { title: "Troika - 3BR Penthouse Suite", property_name: "Troika", url: "https://speedhome.com/rent/klcc", size_sqft: 1900, price_monthly: 5500, bedrooms: "3 Bedrooms" },
      { title: "Troika - 2BR Executive", property_name: "Troika", url: "https://speedhome.com/rent/klcc", size_sqft: 1300, price_monthly: 4000, bedrooms: "2 Bedrooms" },
      { title: "Binjai On The Park - 1BR Premium", property_name: "Binjai On The Park", url: "https://speedhome.com/rent/klcc", size_sqft: 950, price_monthly: 2800, bedrooms: "1 Bedroom" },
      { title: "Binjai On The Park - 2BR Luxury", property_name: "Binjai On The Park", url: "https://speedhome.com/rent/klcc", size_sqft: 1250, price_monthly: 3600, bedrooms: "2 Bedrooms" },
      { title: "Star Residences - 2BR Modern", property_name: "Star Residences", url: "https://speedhome.com/rent/klcc", size_sqft: 1100, price_monthly: 3200, bedrooms: "2 Bedrooms" },
      { title: "Star Residences - 1BR Compact", property_name: "Star Residences", url: "https://speedhome.com/rent/klcc", size_sqft: 700, price_monthly: 2000, bedrooms: "1 Bedroom" },
    ],
    "petaling-jaya": [
      { title: "Ameera Residences - 2BR Family Condo", property_name: "Ameera Residences", url: "https://speedhome.com/rent/petaling-jaya", size_sqft: 1100, price_monthly: 1950, bedrooms: "2 Bedrooms" },
      { title: "Ameera Residences - 1BR Affordable", property_name: "Ameera Residences", url: "https://speedhome.com/rent/petaling-jaya", size_sqft: 750, price_monthly: 1350, bedrooms: "1 Bedroom" },
      { title: "Five Stones - 1BR Budget Friendly", property_name: "Five Stones", url: "https://speedhome.com/rent/petaling-jaya", size_sqft: 750, price_monthly: 1400, bedrooms: "1 Bedroom" },
      { title: "Five Stones - 2BR Value", property_name: "Five Stones", url: "https://speedhome.com/rent/petaling-jaya", size_sqft: 1000, price_monthly: 1850, bedrooms: "2 Bedrooms" },
      { title: "Jaya One - 2BR Trendy Lofts", property_name: "Jaya One", url: "https://speedhome.com/rent/petaling-jaya", size_sqft: 1050, price_monthly: 1800, bedrooms: "2 Bedrooms" },
      { title: "Jaya One - 1BR Studio Modern", property_name: "Jaya One", url: "https://speedhome.com/rent/petaling-jaya", size_sqft: 700, price_monthly: 1300, bedrooms: "1 Bedroom" },
    ],
    "subang-jaya": [
      { title: "Subang Olives - 2BR Family Home", property_name: "Subang Olives", url: "https://speedhome.com/rent/subang-jaya", size_sqft: 1100, price_monthly: 1850, bedrooms: "2 Bedrooms" },
      { title: "Subang Olives - 1BR Cozy", property_name: "Subang Olives", url: "https://speedhome.com/rent/subang-jaya", size_sqft: 750, price_monthly: 1300, bedrooms: "1 Bedroom" },
      { title: "Subang Avenue - 2BR Modern", property_name: "Subang Avenue", url: "https://speedhome.com/rent/subang-jaya", size_sqft: 1050, price_monthly: 1750, bedrooms: "2 Bedrooms" },
      { title: "Subang Avenue - 3BR Spacious", property_name: "Subang Avenue", url: "https://speedhome.com/rent/subang-jaya", size_sqft: 1500, price_monthly: 2600, bedrooms: "3 Bedrooms" },
    ]
  };

  // Normalize area name to match sample data keys
  const areaKey = area.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  
  // Return matching sample data or generic fallback
  if (sampleData[areaKey]) {
    return sampleData[areaKey].map(s => ({ ...s, isSample: true }));
  }

  // Generic fallback for any area
  return [
    { title: `Premium Condo in ${area} - 2BR`, property_name: area, url: "https://speedhome.com", size_sqft: 1100, price_monthly: 2000, bedrooms: "2 Bedrooms", isSample: true },
    { title: `Luxury Apartment in ${area} - 3BR`, property_name: area, url: "https://speedhome.com", size_sqft: 1500, price_monthly: 2800, bedrooms: "3 Bedrooms", isSample: true },
    { title: `Modern Studio in ${area} - 1BR`, property_name: area, url: "https://speedhome.com", size_sqft: 600, price_monthly: 1200, bedrooms: "1 Bedroom", isSample: true },
    { title: `Contemporary Suite in ${area} - 2BR`, property_name: area, url: "https://speedhome.com", size_sqft: 1200, price_monthly: 2300, bedrooms: "2 Bedrooms", isSample: true },
  ];
}

// Cheerio-based scraper for Speedhome listings with anti-bot evasion and retry logic
async function scrapeSpeedhome(scrapeUrl: string): Promise<any[]> {
  console.log(`[Scraper] Attempting to fetch: ${scrapeUrl}`);
  
  const maxRetries = 2;
  const userAgents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  ];

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`[Scraper] Retry attempt ${attempt}/${maxRetries}... waiting ${1000 * attempt}ms`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }

      const userAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
      
      // Set up abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);
      
      const response = await fetch(scrapeUrl, {
        signal: controller.signal,
        headers: {
          "User-Agent": userAgent,
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
          "Accept-Encoding": "gzip, deflate, br",
          "Accept-Language": "en-US,en;q=0.9,ms;q=0.8",
          "Dnt": "1",
          "Cache-Control": "max-age=0",
          "Pragma": "no-cache",
          "Sec-Ch-Ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
          "Sec-Ch-Ua-Mobile": "?0",
          "Sec-Ch-Ua-Platform": '"Windows"',
          "Sec-Fetch-Dest": "document",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-Site": "none",
          "Sec-Fetch-User": "?1",
          "Upgrade-Insecure-Requests": "1",
          "Connection": "keep-alive",
        }
      });
      
      clearTimeout(timeoutId);

      if (response.status === 403) {
        console.warn(`[Scraper] HTTP 403 Forbidden on attempt ${attempt + 1}`);
        if (attempt < maxRetries) continue; // Retry
        throw new Error(`HTTP 403: Speedhome blocking requests (anti-bot detection)`);
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      
      if (!html || html.length < 500) {
        console.warn("[Scraper] Response too short or empty");
        if (attempt < maxRetries) continue; // Retry
        return [];
      }

      // Check if we got a valid HTML response (not error page)
      if (html.includes("blocked") || html.includes("robot") || html.includes("bot")) {
        console.warn("[Scraper] Detected block page in response");
        if (attempt < maxRetries) continue; // Retry
      }

      const $ = load(html);
      const listings: any[] = [];

      // Find all property cards with href containing /details/
      $('a[href*="/details/"]').each((_idx: number, el: any) => {
        try {
          const $card = $(el);
          
          // Get title from h3 or aria-label
          let title = $card.find("h3").text().trim();
          if (!title) {
            title = $card.attr("aria-label")?.replace("View details for ", "") || "";
          }
          
          if (!title) return; // Skip if no title
          
          // Get URL
          let href = $card.attr("href") || "";
          const url = href.startsWith("http") ? href : "https://speedhome.com" + href;

          // Get price from element with class containing "propertyPrice"
          const priceText = $card.find('[class*="propertyPrice"]').text() || "";
          const price_monthly = parseInt(priceText.replace(/[^0-9]/g, "")) || 0;

          if (price_monthly === 0) return; // Skip if no price

          // Get specs (sqft, bedrooms, etc)
          const $specs = $card.find('[class*="propertySpecs"]');
          const specsTexts: string[] = [];
          $specs.find("span").each((_i: number, span: any) => {
            const text = $(span).text().trim();
            if (text) specsTexts.push(text);
          });

          const sqftSpan = specsTexts.find(s => s.includes("sqft")) || "";
          const size_sqft = parseInt(sqftSpan.replace(/[^0-9]/g, "")) || 0;

          const numericSpans = specsTexts.filter(s => /^\d+$/.test(s));
          const bedroomNum = parseInt(numericSpans[0] || "1");

          let bedrooms: string;
          if (bedroomNum === 0) bedrooms = "Studio";
          else if (bedroomNum === 1) bedrooms = "1 Bedroom";
          else if (bedroomNum === 2) bedrooms = "2 Bedrooms";
          else if (bedroomNum === 3) bedrooms = "3 Bedrooms";
          else if (bedroomNum === 4) bedrooms = "4 Bedrooms";
          else bedrooms = "5+ Bedrooms";

          // Property name: part before first comma
          const property_name = title.includes(",") ? title.split(",")[0].trim() : title;

          listings.push({ title, property_name, url, size_sqft, price_monthly, bedrooms });
        } catch (err) {
          console.error("[Scraper] Error parsing card:", err);
        }
      });

      if (listings.length > 0) {
        console.log(`[Scraper] ✓ Successfully parsed ${listings.length} listings from HTML`);
        return listings;
      }

      console.warn(`[Scraper] No listings found on attempt ${attempt + 1}`);
      if (attempt < maxRetries) continue; // Retry
      return [];

    } catch (err: any) {
      console.error(`[Scraper] Error on attempt ${attempt + 1}:`, err.message);
      if (attempt < maxRetries) continue; // Retry
      if (attempt === maxRetries) {
        throw err; // Throw on final attempt
      }
    }
  }

  throw new Error("Failed to scrape after all retry attempts");
}

// Data collection endpoint — scrapes Speedhome directly via Playwright
app.post("/api/collect", async (req, res) => {
  const { url, query } = req.body;

  let searchArea = "";
  let sourceUrlUsed = url || "";
  let scrapeUrl = "";

  if (url && url.trim().toLowerCase().includes("speedhome.com")) {
    try {
      const parsedUrl = new URL(url.trim());
      const pathParts = parsedUrl.pathname.split("/").filter((p: string) => p !== "");
      if (pathParts.length > 0) {
        const segment = pathParts[pathParts.length - 1];
        searchArea = segment.split("-").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
      } else {
        searchArea = "Malaysia";
      }
      scrapeUrl = url.trim();
    } catch {
      searchArea = query || "Kuala Lumpur";
      const URLSlug = searchArea.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      scrapeUrl = `https://speedhome.com/rent/${URLSlug}`;
      sourceUrlUsed = scrapeUrl;
    }
  } else {
    searchArea = query || "Mont Kiara";
    const URLSlug = searchArea.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    scrapeUrl = `https://speedhome.com/rent/${URLSlug}`;
    if (!sourceUrlUsed) sourceUrlUsed = scrapeUrl;
  }

  try {
    console.log(`[Scraper] Collecting listings for: ${searchArea}`);
    let listings = [];
    
    // Try real scraping first
    try {
      listings = await scrapeSpeedhome(scrapeUrl);
    } catch (scrapeErr: any) {
      console.warn(`[Scraper] Live scraping failed: ${scrapeErr.message}`);
      console.log("[Scraper] Using sample data as fallback");
      
      // Fallback: use sample/mock data
      listings = generateSampleListings(searchArea);
    }

    // Process and augment listings
    const processedListings = listings.map((l: any, idx: number) => {
      const monthly = l.price_monthly;
      const yearly = monthly * 12;
      const daily = Math.round((monthly / 30) * 1.5);

      return {
        id: `sh-${idx + 1}`,
        title: l.title || `${l.bedrooms} at ${l.property_name || searchArea}`,
        property_name: l.property_name || searchArea,
        bedrooms: l.bedrooms,
        price_monthly: monthly,
        price_yearly: yearly,
        price_daily: daily,
        size_sqft: l.size_sqft || 0,
        furnishing: "fully furnished",
        url: l.url
      };
    });

    // Calculate Overall Summary Stats
    const overallSummary = calculateStats(processedListings);

    // Calculate Segment Summaries (Studio, 1BR, 2BR, 3BR, 4BR+)
    const segments = ["Studio", "1 Bedroom", "2 Bedrooms", "3 Bedrooms", "4 Bedrooms", "5+ Bedrooms"];
    const segmentSummary = segments.map(seg => {
      const segListings = processedListings.filter(l => l.bedrooms === seg);
      const stats = calculateStats(segListings);
      return {
        segment: seg,
        ...stats
      };
    }).filter(s => s.count > 0); // only keep segments that have listings

    const isLiveData = listings.length > 0 && !listings[0].isSample;
    
    res.json({
      area_name: searchArea,
      source_url: sourceUrlUsed,
      collected_at: new Date().toISOString(),
      overall_summary: overallSummary,
      segment_summary: segmentSummary,
      listings: processedListings,
      ...(isLiveData ? {} : { note: "Showing sample data. Live scraping temporarily unavailable." })
    });

  } catch (error: any) {
    console.error("Collection error:", error);
    res.status(500).json({ error: error.message || "Failed to collect rental listings" });
  }
});

// Vite middleware & Static asset serving setup
async function createAppServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
}

function listenOnPort(port: number) {
  return new Promise<import("http").Server>((resolve, reject) => {
    const server = app.listen(port, "0.0.0.0", () => resolve(server));
    server.on("error", (err: NodeJS.ErrnoException) => reject({ err, port }));
  });
}

async function startServer(port: number = START_PORT) {
  await createAppServer();

  try {
    const server = await listenOnPort(port);
    console.log(`Server running on http://localhost:${port}`);
    return server;
  } catch (payload: any) {
    const err: NodeJS.ErrnoException = payload.err;
    const attemptedPort: number = payload.port;

    if (err.code === "EADDRINUSE" && !isPortExplicit && attemptedPort < START_PORT + 5) {
      console.warn(`Port ${attemptedPort} already in use, trying ${attemptedPort + 1}...`);
      return startServer(attemptedPort + 1);
    }

    if (err.code === "EADDRINUSE") {
      console.error(`Port ${attemptedPort} is already in use. Please stop the process using that port or set PORT to a different value.`);
    } else {
      console.error("Server failed to start:", err);
    }
    process.exit(1);
  }
}

startServer();
