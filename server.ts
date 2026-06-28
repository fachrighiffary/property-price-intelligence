import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { chromium } from "playwright";
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

// Playwright scraper for Speedhome listings
async function scrapeSpeedhome(scrapeUrl: string): Promise<any[]> {
  console.log(`[Playwright] Scraping: ${scrapeUrl}`);
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setExtraHTTPHeaders({
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9",
    });

    await page.goto(scrapeUrl, { waitUntil: "domcontentloaded", timeout: 30000 });

    try {
      await page.waitForSelector('a[href*="/details/"]', { timeout: 15000 });
    } catch {
      console.warn("[Playwright] No listing cards found, page may be empty or blocked.");
      return [];
    }

    // Short pause to let lazy-loaded content settle
    await page.waitForTimeout(1500);

    const rawListings: any[] = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('a[href*="/details/"]'));
      return cards.map((card: any) => {
        const h3 = card.querySelector("h3");
        const title: string = h3
          ? h3.innerText.trim()
          : (card.getAttribute("aria-label") || "").replace("View details for ", "");

        const href: string = card.getAttribute("href") || "";
        const url: string = href.startsWith("http") ? href : "https://speedhome.com" + href;

        // Price
        const priceEl: any = card.querySelector('[class*="propertyPrice"]');
        const priceText: string = priceEl ? priceEl.innerText : "";
        const price_monthly: number = parseInt(priceText.replace(/[^0-9]/g, "")) || 0;

        // Specs: sqft + bedrooms
        const specsEl: any = card.querySelector('[class*="propertySpecs"]');
        const specsSpans: string[] = specsEl
          ? Array.from(specsEl.querySelectorAll("span")).map((s: any) => s.innerText?.trim() || "")
          : [];

        const sqftSpan = specsSpans.find((s: string) => s.includes("sqft")) || "0";
        const size_sqft: number = parseInt(sqftSpan.replace(/[^0-9]/g, "")) || 0;

        const numericSpans = specsSpans.filter((s: string) => /^\d+$/.test(s));
        const bedroomNum: number = parseInt(numericSpans[0] || "1");

        let bedrooms: string;
        if (bedroomNum === 0) bedrooms = "Studio";
        else if (bedroomNum === 1) bedrooms = "1 Bedroom";
        else if (bedroomNum === 2) bedrooms = "2 Bedrooms";
        else if (bedroomNum === 3) bedrooms = "3 Bedrooms";
        else if (bedroomNum === 4) bedrooms = "4 Bedrooms";
        else bedrooms = "5+ Bedrooms";

        // Property name: part before the first comma in title
        const property_name: string = title.includes(",")
          ? title.split(",")[0].trim()
          : title;

        return { title, property_name, url, size_sqft, price_monthly, bedrooms };
      });
    });

    return rawListings.filter((l: any) => l.price_monthly > 0);
  } finally {
    await browser.close();
  }
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
    const listings = await scrapeSpeedhome(scrapeUrl);

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

    res.json({
      area_name: searchArea,
      source_url: sourceUrlUsed,
      collected_at: new Date().toISOString(),
      overall_summary: overallSummary,
      segment_summary: segmentSummary,
      listings: processedListings
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
