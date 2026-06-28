async function test() {
  const urls = [
    "https://sh-api.speedhome.com/v1/public/rent/search?q=Mont%20Kiara",
    "https://api.speedhome.com/v1/public/rent/search?q=Mont%20Kiara",
    "https://api.speedrent.com.my/v1/public/rent/search?q=Mont%20Kiara"
  ];

  for (const url of urls) {
    console.log("-----------------------------------------");
    console.log("Trying URL:", url);
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json'
        }
      });
      console.log("Status:", res.status);
      const text = await res.text();
      console.log("Length:", text.length);
      console.log("Response (first 300 chars):", text.substring(0, 300));
    } catch (err: any) {
      console.log("Error:", err.message);
    }
  }
}

test();
