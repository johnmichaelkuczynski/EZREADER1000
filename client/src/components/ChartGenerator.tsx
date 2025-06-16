import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { BarChart3, LineChart, Dot, AreaChart } from 'lucide-react';

interface ChartResult {
  url: string;
  message: string;
  filename: string;
}

export function ChartGenerator() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [chartResult, setChartResult] = useState<ChartResult | null>(null);
  const { toast } = useToast();

  const [lineChartData, setLineChartData] = useState({
    xData: '1,2,3,4,5',
    yData: '1,4,9,16,25',
    title: 'Line Chart',
    xLabel: 'X Axis',
    yLabel: 'Y Axis'
  });

  const [barChartData, setBarChartData] = useState({
    categories: 'A,B,C,D,E',
    values: '10,25,15,30,20',
    title: 'Bar Chart',
    xLabel: 'Categories',
    yLabel: 'Values'
  });

  const [scatterData, setScatterData] = useState({
    xData: '1,2,3,4,5',
    yData: '2,5,3,8,7',
    title: 'Scatter Plot',
    xLabel: 'X Axis',
    yLabel: 'Y Axis'
  });

  const parseNumbers = (str: string): number[] => {
    return str.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
  };

  const parseStrings = (str: string): string[] => {
    return str.split(',').map(s => s.trim()).filter(s => s.length > 0);
  };

  const generateLineChart = async () => {
    setIsGenerating(true);
    try {
      const xData = parseNumbers(lineChartData.xData);
      const yData = parseNumbers(lineChartData.yData);

      if (xData.length === 0 || yData.length === 0) {
        throw new Error('Please provide valid numeric data for both X and Y axes');
      }

      if (xData.length !== yData.length) {
        throw new Error('X and Y data must have the same number of points');
      }

      const response = await fetch('/api/generate-line-chart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          xData,
          yData,
          title: lineChartData.title,
          xLabel: lineChartData.xLabel,
          yLabel: lineChartData.yLabel
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate line chart');
      }

      const result = await response.json();
      setChartResult(result);
      toast({
        title: "Chart Generated",
        description: "Your line chart has been created successfully!"
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const generateBarChart = async () => {
    setIsGenerating(true);
    try {
      const categories = parseStrings(barChartData.categories);
      const values = parseNumbers(barChartData.values);

      if (categories.length === 0 || values.length === 0) {
        throw new Error('Please provide valid categories and numeric values');
      }

      if (categories.length !== values.length) {
        throw new Error('Categories and values must have the same number of items');
      }

      const response = await fetch('/api/generate-bar-chart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categories,
          values,
          title: barChartData.title,
          xLabel: barChartData.xLabel,
          yLabel: barChartData.yLabel
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate bar chart');
      }

      const result = await response.json();
      setChartResult(result);
      toast({
        title: "Chart Generated",
        description: "Your bar chart has been created successfully!"
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const generateScatterPlot = async () => {
    setIsGenerating(true);
    try {
      const xData = parseNumbers(scatterData.xData);
      const yData = parseNumbers(scatterData.yData);

      if (xData.length === 0 || yData.length === 0) {
        throw new Error('Please provide valid numeric data for both X and Y axes');
      }

      if (xData.length !== yData.length) {
        throw new Error('X and Y data must have the same number of points');
      }

      const response = await fetch('/api/generate-scatter-plot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          xData,
          yData,
          title: scatterData.title,
          xLabel: scatterData.xLabel,
          yLabel: scatterData.yLabel
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate scatter plot');
      }

      const result = await response.json();
      setChartResult(result);
      toast({
        title: "Chart Generated",
        description: "Your scatter plot has been created successfully!"
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const testPlotlyConnection = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/test-plotly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Connection Successful",
          description: result.message
        });
      } else {
        toast({
          title: "Connection Failed",
          description: result.message,
          variant: "destructive"
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || 'Failed to test connection',
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Chart Generator
          </CardTitle>
          <CardDescription>
            Create interactive charts and visualizations for your data analysis and homework assignments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <Button 
              onClick={testPlotlyConnection} 
              disabled={isGenerating}
              variant="outline"
            >
              Test Connection
            </Button>
          </div>

          <Tabs defaultValue="line" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="line" className="flex items-center gap-2">
                <LineChart className="h-4 w-4" />
                Line Chart
              </TabsTrigger>
              <TabsTrigger value="bar" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Bar Chart
              </TabsTrigger>
              <TabsTrigger value="scatter" className="flex items-center gap-2">
                <Dot className="h-4 w-4" />
                Scatter Plot
              </TabsTrigger>
            </TabsList>

            <TabsContent value="line" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="line-x-data">X Data (comma-separated)</Label>
                  <Input
                    id="line-x-data"
                    value={lineChartData.xData}
                    onChange={(e) => setLineChartData({...lineChartData, xData: e.target.value})}
                    placeholder="1,2,3,4,5"
                  />
                </div>
                <div>
                  <Label htmlFor="line-y-data">Y Data (comma-separated)</Label>
                  <Input
                    id="line-y-data"
                    value={lineChartData.yData}
                    onChange={(e) => setLineChartData({...lineChartData, yData: e.target.value})}
                    placeholder="1,4,9,16,25"
                  />
                </div>
                <div>
                  <Label htmlFor="line-title">Chart Title</Label>
                  <Input
                    id="line-title"
                    value={lineChartData.title}
                    onChange={(e) => setLineChartData({...lineChartData, title: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="line-x-label">X Axis Label</Label>
                  <Input
                    id="line-x-label"
                    value={lineChartData.xLabel}
                    onChange={(e) => setLineChartData({...lineChartData, xLabel: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="line-y-label">Y Axis Label</Label>
                  <Input
                    id="line-y-label"
                    value={lineChartData.yLabel}
                    onChange={(e) => setLineChartData({...lineChartData, yLabel: e.target.value})}
                  />
                </div>
              </div>
              <Button onClick={generateLineChart} disabled={isGenerating} className="w-full">
                {isGenerating ? 'Generating...' : 'Generate Line Chart'}
              </Button>
            </TabsContent>

            <TabsContent value="bar" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="bar-categories">Categories (comma-separated)</Label>
                  <Input
                    id="bar-categories"
                    value={barChartData.categories}
                    onChange={(e) => setBarChartData({...barChartData, categories: e.target.value})}
                    placeholder="A,B,C,D,E"
                  />
                </div>
                <div>
                  <Label htmlFor="bar-values">Values (comma-separated)</Label>
                  <Input
                    id="bar-values"
                    value={barChartData.values}
                    onChange={(e) => setBarChartData({...barChartData, values: e.target.value})}
                    placeholder="10,25,15,30,20"
                  />
                </div>
                <div>
                  <Label htmlFor="bar-title">Chart Title</Label>
                  <Input
                    id="bar-title"
                    value={barChartData.title}
                    onChange={(e) => setBarChartData({...barChartData, title: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="bar-x-label">X Axis Label</Label>
                  <Input
                    id="bar-x-label"
                    value={barChartData.xLabel}
                    onChange={(e) => setBarChartData({...barChartData, xLabel: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="bar-y-label">Y Axis Label</Label>
                  <Input
                    id="bar-y-label"
                    value={barChartData.yLabel}
                    onChange={(e) => setBarChartData({...barChartData, yLabel: e.target.value})}
                  />
                </div>
              </div>
              <Button onClick={generateBarChart} disabled={isGenerating} className="w-full">
                {isGenerating ? 'Generating...' : 'Generate Bar Chart'}
              </Button>
            </TabsContent>

            <TabsContent value="scatter" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="scatter-x-data">X Data (comma-separated)</Label>
                  <Input
                    id="scatter-x-data"
                    value={scatterData.xData}
                    onChange={(e) => setScatterData({...scatterData, xData: e.target.value})}
                    placeholder="1,2,3,4,5"
                  />
                </div>
                <div>
                  <Label htmlFor="scatter-y-data">Y Data (comma-separated)</Label>
                  <Input
                    id="scatter-y-data"
                    value={scatterData.yData}
                    onChange={(e) => setScatterData({...scatterData, yData: e.target.value})}
                    placeholder="2,5,3,8,7"
                  />
                </div>
                <div>
                  <Label htmlFor="scatter-title">Chart Title</Label>
                  <Input
                    id="scatter-title"
                    value={scatterData.title}
                    onChange={(e) => setScatterData({...scatterData, title: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="scatter-x-label">X Axis Label</Label>
                  <Input
                    id="scatter-x-label"
                    value={scatterData.xLabel}
                    onChange={(e) => setScatterData({...scatterData, xLabel: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="scatter-y-label">Y Axis Label</Label>
                  <Input
                    id="scatter-y-label"
                    value={scatterData.yLabel}
                    onChange={(e) => setScatterData({...scatterData, yLabel: e.target.value})}
                  />
                </div>
              </div>
              <Button onClick={generateScatterPlot} disabled={isGenerating} className="w-full">
                {isGenerating ? 'Generating...' : 'Generate Scatter Plot'}
              </Button>
            </TabsContent>
          </Tabs>

          {chartResult && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Generated Chart</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">{chartResult.message}</p>
                  <div className="flex gap-4">
                    <Button asChild>
                      <a href={chartResult.url} target="_blank" rel="noopener noreferrer">
                        View Chart
                      </a>
                    </Button>
                    <Button variant="outline" onClick={() => navigator.clipboard.writeText(chartResult.url)}>
                      Copy URL
                    </Button>
                  </div>
                  <div className="w-full h-96 border rounded-lg overflow-hidden">
                    <iframe
                      src={chartResult.url}
                      className="w-full h-full"
                      title="Generated Chart"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}