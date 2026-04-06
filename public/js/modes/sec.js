export default {
  name: 'sec',
  title: 'SEC Filing RAG',
  defaultMessage: 'What was Apple\'s revenue in fiscal year 2022?',
  promptEndpoint: '/api/prompt/sec',
  modelOptions: [
    { value: 'claude-sonnet-4-5-20250929', label: 'Sonnet 4.5' }
  ],
  tools: [
    {
      name: 'search_sec_filings',
      description: 'Search SEC 10-K filings for a given company. Returns excerpts from the filing text matching the query.',
      input_schema: {
        type: 'object',
        properties: {
          ticker: {
            type: 'string',
            description: 'Stock ticker symbol, e.g. "aapl", "msft"'
          },
          year: {
            type: 'string',
            description: 'Fiscal year of the filing, e.g. "2022"'
          },
          q: {
            type: 'string',
            description: 'Search query to find relevant sections in the filing, e.g. "revenue", "net income"'
          }
        },
        required: ['ticker']
      }
    }
  ],

  async handleToolCall(toolName, toolInput) {
    if (toolName !== 'search_sec_filings') {
      return JSON.stringify({ error: `Unknown tool: ${toolName}` });
    }
    const params = new URLSearchParams();
    if (toolInput.ticker) params.set('ticker', toolInput.ticker);
    if (toolInput.year) params.set('year', toolInput.year);
    if (toolInput.q) params.set('q', toolInput.q);

    const res = await fetch(`/sec/search?${params}`);
    if (!res.ok) {
      const text = await res.text();
      return JSON.stringify({ error: `Search failed: HTTP ${res.status}`, detail: text });
    }
    return await res.text();
  },

  async handleResponse(data, _messages) {
    const textBlock = data.content?.find(b => b.type === 'text');
    const raw = textBlock?.text ?? '';
    return { raw, parsed: null, error: null, retry: false };
  }
};
