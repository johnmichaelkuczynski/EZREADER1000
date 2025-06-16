import fetch from 'node-fetch';

const PLOTLY_API_URL = 'https://api.plot.ly/v2';

interface PlotlyChart {
  data: any[];
  layout: any;
  config?: any;
}

interface PlotlyResponse {
  url: string;
  message: string;
  filename: string;
  error?: string;
}

// Generate chart using Plotly API
export async function generateChart(chartData: PlotlyChart, filename: string = 'chart'): Promise<PlotlyResponse> {
  try {
    const apiKey = process.env.PLOTLY_API_KEY;
    
    if (!apiKey) {
      throw new Error('Plotly API key not configured');
    }

    // Prepare the chart payload
    const payload = {
      figure: {
        data: chartData.data,
        layout: chartData.layout || {}
      },
      filename: filename,
      fileopt: 'overwrite',
      sharing: 'public',
      world_readable: true
    };

    const response = await fetch(`${PLOTLY_API_URL}/plots`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Plotly-Client-Platform': 'nodejs',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json() as any;

    if (!response.ok) {
      throw new Error(`Plotly API error: ${result.error?.message || response.statusText}`);
    }

    return {
      url: result.url,
      message: result.message,
      filename: result.filename
    };

  } catch (error: any) {
    console.error('Plotly chart generation error:', error);
    throw new Error(`Failed to generate chart: ${error.message}`);
  }
}

// Create a simple line chart
export async function createLineChart(
  xData: number[],
  yData: number[],
  title: string = 'Line Chart',
  xLabel: string = 'X Axis',
  yLabel: string = 'Y Axis'
): Promise<PlotlyResponse> {
  const chartData: PlotlyChart = {
    data: [{
      x: xData,
      y: yData,
      type: 'scatter',
      mode: 'lines+markers',
      name: 'Data Series'
    }],
    layout: {
      title: title,
      xaxis: { title: xLabel },
      yaxis: { title: yLabel }
    }
  };

  return generateChart(chartData, title.toLowerCase().replace(/\s+/g, '_'));
}

// Create a bar chart
export async function createBarChart(
  categories: string[],
  values: number[],
  title: string = 'Bar Chart',
  xLabel: string = 'Categories',
  yLabel: string = 'Values'
): Promise<PlotlyResponse> {
  const chartData: PlotlyChart = {
    data: [{
      x: categories,
      y: values,
      type: 'bar',
      name: 'Data Series'
    }],
    layout: {
      title: title,
      xaxis: { title: xLabel },
      yaxis: { title: yLabel }
    }
  };

  return generateChart(chartData, title.toLowerCase().replace(/\s+/g, '_'));
}

// Create a scatter plot
export async function createScatterPlot(
  xData: number[],
  yData: number[],
  title: string = 'Scatter Plot',
  xLabel: string = 'X Axis',
  yLabel: string = 'Y Axis'
): Promise<PlotlyResponse> {
  const chartData: PlotlyChart = {
    data: [{
      x: xData,
      y: yData,
      type: 'scatter',
      mode: 'markers',
      name: 'Data Points'
    }],
    layout: {
      title: title,
      xaxis: { title: xLabel },
      yaxis: { title: yLabel }
    }
  };

  return generateChart(chartData, title.toLowerCase().replace(/\s+/g, '_'));
}

// Create a histogram
export async function createHistogram(
  data: number[],
  title: string = 'Histogram',
  xLabel: string = 'Values',
  yLabel: string = 'Frequency'
): Promise<PlotlyResponse> {
  const chartData: PlotlyChart = {
    data: [{
      x: data,
      type: 'histogram',
      name: 'Distribution'
    }],
    layout: {
      title: title,
      xaxis: { title: xLabel },
      yaxis: { title: yLabel }
    }
  };

  return generateChart(chartData, title.toLowerCase().replace(/\s+/g, '_'));
}

// Test Plotly API connection
export async function testPlotlyConnection(): Promise<{ success: boolean; message: string }> {
  try {
    const testData = [1, 2, 3, 4, 5];
    const result = await createLineChart(testData, testData, 'Test Chart');
    
    return {
      success: true,
      message: `Plotly API working. Test chart created: ${result.url}`
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Plotly API test failed: ${error.message}`
    };
  }
}