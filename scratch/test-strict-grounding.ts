import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();

async function test() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log("No GEMINI_API_KEY");
    return;
  }

  const ai = new GoogleGenAI({ apiKey });
  const searchArea = "Mont Kiara";

  const prompt = `You are an expert real estate researcher and automated scraping engine for the Malaysian rental platform Speedhome.com.
Your goal is to gather a list of actual, active property listings in "${searchArea}" from Speedhome.

To do this, you MUST search Google using queries like:
- "site:speedhome.com/details \\"${searchArea}\\""
- "site:speedhome.com \\"${searchArea}\\" rent price"
- "site:speedhome.com \\"${searchArea}\\" condo"

CRITICAL ACCURACY REQUIREMENT:
1. ONLY return property listings that you actually find in the Google search results snippets.
2. Extract the EXACT price monthly (e.g. RM 2,000, RM 3,500), property name, and bedroom count from the snippets.
3. DO NOT synthesize, hallucinate, approximate, or fabricate any property listings, prices, or bedroom counts. 
4. DO NOT make up generic listings to fill a quota. If you only find 10 real listings, return exactly those 10 listings. If you find 40, return all 40.
5. If the search results contain a price range (e.g. "from RM 2,000"), use the minimum price as the price_monthly.

Every single listing in the response MUST correspond to a real search result snippet you read. Do not hallucinate any listings.

Response JSON format must be EXACTLY:
{
  "listings": [
    {
      "title": "String",
      "property_name": "String",
      "bedrooms": "String",
      "price_monthly": Number,
      "size_sqft": Number,
      "furnishing": "String",
      "url": "String"
    }
  ]
}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    console.log("Success! Raw Response Text:");
    console.log(response.text);

    // Try to parse the JSON block
    const text = (response.text || "").trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const json = JSON.parse(jsonMatch[0]);
      console.log("Successfully Parsed JSON! Listings count:", json.listings?.length);
      console.log("Sample listing:", json.listings?.[0]);
    } else {
      console.log("No JSON block found in response.");
    }
  } catch (err: any) {
    console.log("Error during grounding JSON call:", err.message);
  }
}

test();
