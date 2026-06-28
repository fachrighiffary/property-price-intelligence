async function test() {
  const url = "https://speedhome.com/api/v1/public/rent/search?q=Mont%20Kiara";
  console.log("Trying URL with full browser headers:", url);

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://speedhome.com/',
        'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"macOS"',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin',
        'Connection': 'keep-alive'
      }
    });

    console.log("Status:", res.status);
    const text = await res.text();
    console.log("Length:", text.length);
    console.log("Text starts with:", text.substring(0, 500));
  } catch (err: any) {
    console.log("Error:", err.message);
  }
}

test();
