const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight requests
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // Only allow GET requests
    if (request.method !== "GET") {
      return new Response("Method not allowed", {
        status: 405,
        headers: corsHeaders,
      });
    }

    // Parse the URL from the incoming request
    const url = new URL(request.url);

    // Handle favicon requests and other non-API requests
    if (url.pathname === "/favicon.ico" || url.pathname !== "/") {
      return new Response("Not found", {
        status: 404,
        headers: corsHeaders,
      });
    }

    // Extract the ticker and dates from the request URL
    const ticker = url.searchParams.get("ticker");
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");

    console.log(`Received request: ticker=${ticker}, startDate=${startDate}, endDate=${endDate}`);

    // Ensure necessary parameters are present
    if (!ticker || !startDate || !endDate) {
      return new Response(JSON.stringify({
        error: "Missing required parameters: ticker, startDate, endDate",
        received: { ticker, startDate, endDate },
        usage: "Usage: /?ticker=TSLA&startDate=2023-01-01&endDate=2023-01-03"
      }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // Validate ticker format (1-5 uppercase letters)
    if (!/^[A-Z]{1,5}$/.test(ticker)) {
      return new Response(JSON.stringify({
        error: "Invalid ticker format. Use 1-5 uppercase letters (e.g., TSLA, AAPL)"
      }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      return new Response(JSON.stringify({
        error: "Invalid date format. Use YYYY-MM-DD"
      }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // Check if API key exists
    if (!env.POLYGON_API_KEY) {
      return new Response(JSON.stringify({
        error: "Polygon API key not configured"
      }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    // Construct the Polygon API URL
    const polygonURL = `https://api.polygon.io/v2/aggs/ticker/${ticker}/range/1/day/${startDate}/${endDate}`;

    try {
      console.log(`Fetching data for ${ticker} from ${startDate} to ${endDate}`);

      const polygonResponse = await fetch(
        `${polygonURL}?apiKey=${env.POLYGON_API_KEY}`
      );

      if (!polygonResponse.ok) {
        const errorText = await polygonResponse.text();
        console.error(`Polygon API error: ${polygonResponse.status} - ${errorText}`);
        throw new Error(`Polygon API returned ${polygonResponse.status}: ${errorText}`);
      }

      // Parse response body as JSON and remove `request_id` for better caching
      const data = await polygonResponse.json();
      delete data.request_id;

      console.log(`Successfully fetched data for ${ticker}`);
      return new Response(JSON.stringify(data), {
        headers: corsHeaders
      });

    } catch (error) {
      console.error(`Error fetching data: ${error.message}`);
      return new Response(JSON.stringify({
        error: `Failed to fetch data: ${error.message}`
      }), {
        status: 500,
        headers: corsHeaders
      });
    }
  },
};