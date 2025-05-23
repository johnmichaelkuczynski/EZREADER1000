const GOOGLE_API_URL = 'https://www.googleapis.com/customsearch/v1';

interface GoogleSearchResult {
  title: string;
  link: string;
  snippet: string;
  pagemap?: {
    metatags?: Array<{
      [key: string]: string;
    }>;
  };
}

interface GoogleSearchResponse {
  items: GoogleSearchResult[];
  searchInformation: {
    totalResults: string;
  };
}

export async function searchOnline(query: string, maxResults = 5): Promise<{
  results: Array<{
    title: string;
    url: string;
    snippet: string;
  }>;
  content: string;
}> {
  const apiKey = process.env.GOOGLE_API_KEY;
  const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;
  
  if (!apiKey || !searchEngineId) {
    throw new Error('Google API Key or Search Engine ID not configured');
  }
  
  try {
    const params = new URLSearchParams({
      key: apiKey,
      cx: searchEngineId,
      q: query,
      num: maxResults.toString()
    });
    
    const response = await fetch(`${GOOGLE_API_URL}?${params.toString()}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google API error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json() as GoogleSearchResponse;
    
    if (!data.items || data.items.length === 0) {
      return {
        results: [],
        content: `No results found for: ${query}`
      };
    }
    
    const results = data.items.map(item => ({
      title: item.title,
      url: item.link,
      snippet: item.snippet
    }));
    
    // Create a formatted content string from the results
    const contentLines = results.map((result, index) => {
      return `[${index + 1}] ${result.title}\n${result.url}\n${result.snippet}\n`;
    });
    
    return {
      results,
      content: contentLines.join('\n')
    };
  } catch (error) {
    console.error("Google search error:", error);
    throw new Error(`Failed to search online: ${error.message}`);
  }
}

export async function fetchWebContent(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch content: ${response.status} ${response.statusText}`);
    }
    
    const html = await response.text();
    
    // Extremely simple HTML to text conversion
    // In a production app, you'd want to use a library like cheerio or turndown
    const text = html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    return text;
  } catch (error) {
    console.error("Content fetching error:", error);
    throw new Error(`Failed to fetch web content: ${error.message}`);
  }
}
