"use client";

import React, { useState } from "react";
import Papa from "papaparse";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
//import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Upload, BarChart2, MessageSquare } from "lucide-react";
import { GoogleGenerativeAI } from "@google/generative-ai";

//import { GoogleGenerativeAI } from "@google/generative-ai";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

// ... (keep all the existing interfaces and functions)
// Define an interface for the CSV data structure
const DURATION = "1yr";
const MY_FILTER = "price";
const REFERENCE_SHARE = "NIFTYBEES";

const indexList = ["NIFTYBEES", "MONIFTY500", "GOLDIETF", "MON100"];

interface CSVRow {
  symbol: string;
  trade_type: string;
  quantity: string;
  price: string;
  trade_date: string;
  // Add any other fields that are present in your CSV
}

function processCSV(data: CSVRow[]): { filteredData: CSVRow[] } {
  console.log("processCSV input data length:", data.length);

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  sixMonthsAgo.setDate(1);

  const lastDayOfLastMonth = new Date();
  lastDayOfLastMonth.setDate(0);

  console.log("Date range:", sixMonthsAgo, "to", lastDayOfLastMonth);

  const filteredData = data.filter((row) => {
    const tradeDate = new Date(row.trade_date);
    return tradeDate >= sixMonthsAgo && tradeDate <= lastDayOfLastMonth;
  });

  console.log("Filtered data length:", filteredData.length);
  console.log("Sample filtered data:", filteredData.slice(0, 3));

  if (filteredData.length === 0) {
    console.warn("No data within the specified date range");
    return { filteredData: [] };
  }

  const shareHoldings: { [key: string]: number } = {};
  const cleanedData = filteredData.reduce<CSVRow[]>((acc, row, index) => {
    console.log(`Processing row ${index + 1}:`, row);
    const { symbol, trade_type, quantity } = row;
    if (!symbol || !trade_type || !quantity) {
      console.warn(`Skipping row ${index + 1} due to missing data:`, row);
      return acc;
    }
    const tradeQuantity = parseInt(quantity);
    if (isNaN(tradeQuantity)) {
      console.warn(`Invalid quantity in row ${index + 1}:`, row);
      return acc;
    }

    const upperCaseTradeType = trade_type.toUpperCase();

    if (upperCaseTradeType === "BUY") {
      shareHoldings[symbol] = (shareHoldings[symbol] || 0) + tradeQuantity;
      acc.push(row);
      console.log(
        `Added BUY transaction for ${symbol}, quantity: ${tradeQuantity}`
      );
    } else if (upperCaseTradeType === "SELL") {
      if (shareHoldings[symbol] >= tradeQuantity) {
        shareHoldings[symbol] -= tradeQuantity;
        acc.push(row);
        console.log(
          `Added SELL transaction for ${symbol}, quantity: ${tradeQuantity}`
        );
      } else if (shareHoldings[symbol] > 0) {
        row.quantity = shareHoldings[symbol].toString();
        shareHoldings[symbol] = 0;
        acc.push(row);
        console.log(
          `Adjusted SELL transaction for ${symbol}, quantity: ${shareHoldings[symbol]}`
        );
      } else {
        console.warn(
          `Skipping SELL transaction for ${symbol}, insufficient holdings`
        );
      }
    } else {
      console.warn(`Unknown trade_type in row ${index + 1}:`, row);
    }
    return acc;
  }, []);

  return { filteredData: cleanedData };
}

interface PlotDataPoint {
  date: Date;
  portfolioValue: number;
  alternateValue: number;
  gain: number;
}

// Define an interface for the price data structure
interface PriceData {
  date: Date;
  closingPrice: number;
}

const API_KEY = process.env.NEXT_PUBLIC_STOCK_API;

// ... rest of your imports and component setup ...

async function getClosingPricesForShares(
  shares: string[],
  duration: string,
  myfilter: string
): Promise<Map<string, PriceData[]>> {
  const masterPrices = new Map<string, PriceData[]>();

  for (const share of shares) {
    const url = `https://stock.indianapi.in/historical_data?stock_name=${share}&period=${duration}&filter=${myfilter}`;

    console.log(`Fetching data for ${share}`);

    try {
      const response = await fetch(url, {
        headers: { "X-Api-Key": API_KEY || "" },
      });

      if (!response.ok) {
        const responseText = await response.text();
        throw new Error(
          `HTTP error! Status: ${response.status}, Response: ${responseText}`
        );
      }

      const data = await response.json();

      if (data && data.datasets && data.datasets.length > 0) {
        const priceDataset = data.datasets.find(
          (dataset: { metric: string }) => dataset.metric === "Price"
        );
        if (priceDataset && priceDataset.values) {
          const closingPrices: PriceData[] = priceDataset.values.map(
            (entry: [string, string]) => ({
              date: new Date(entry[0]),
              closingPrice: parseFloat(entry[1]),
            })
          );
          masterPrices.set(share, closingPrices);
        } else {
          console.error(`No price data found for the share: ${share}`);
          masterPrices.set(share, []);
        }
      } else {
        console.error(`No data found for the share: ${share}`);
        masterPrices.set(share, []);
      }
    } catch (error) {
      console.error(`Error fetching data for ${share}:`, error);
      masterPrices.set(share, []);
    }
  }

  return masterPrices;
}

function getSixMonths(): { month: number; year: number }[] {
  const today = new Date();
  const months = [];
  for (let i = 6; i > 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    months.push({ month: d.getMonth() + 1, year: d.getFullYear() });
  }
  return months;
}

function getLastTradingDays(
  allMonths: { month: number; year: number }[],
  masterPrices: Map<string, PriceData[]>
): Map<string, Date> {
  console.log("Starting getLastTradingDays...");
  const lastDays = new Map();

  const referencePrices = masterPrices.get(REFERENCE_SHARE);
  if (!referencePrices || referencePrices.length === 0) {
    console.error(`No price data available for ${REFERENCE_SHARE}`);
    return lastDays;
  }

  allMonths.forEach(({ month, year }) => {
    const monthKey = `${year}-${month.toString().padStart(2, "0")}`;
    console.log(`Processing month: ${monthKey}`);

    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const startOfNextMonth = new Date(nextYear, nextMonth - 1, 1);

    // Find the last trading day of the current month
    const lastTradingDay = referencePrices
      .filter((price) => {
        const priceDate = new Date(price.date);
        return (
          priceDate.getFullYear() === year &&
          priceDate.getMonth() === month - 1 &&
          priceDate < startOfNextMonth
        );
      })
      .sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      )[0];

    if (lastTradingDay) {
      lastDays.set(monthKey, new Date(lastTradingDay.date));
      console.log(`Last trading day for ${monthKey}: ${lastTradingDay.date}`);
    } else {
      console.warn(`No trading day found for ${monthKey}`);
    }
  });

  console.log("Finished getLastTradingDays");
  return lastDays;
}

function generatePortfolioValues(
  filteredData: CSVRow[],
  lastDays: Map<string, Date>,
  masterPrices: Map<string, PriceData[]>
): PlotDataPoint[] {
  const portfolioValues: PlotDataPoint[] = [];
  const portfolio: { [key: string]: number } = {};
  let alternatePortfolio = 0;

  lastDays.forEach((lastDay, monthYear) => {
    console.log(`Processing month: ${monthYear}`);
    const [year, month] = monthYear.split("-").map(Number);
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = lastDay;

    // Process transactions for the month
    filteredData.forEach((transaction) => {
      const transactionDate = new Date(transaction.trade_date);
      if (transactionDate >= monthStart && transactionDate <= monthEnd) {
        const { symbol, trade_type, quantity, price } = transaction;
        const shareQuantity = parseInt(quantity);
        const sharePrice = parseFloat(price);

        console.log(
          `Processing transaction: ${symbol} ${trade_type} ${shareQuantity} @ ${sharePrice}`
        );

        if (trade_type.toUpperCase() === "BUY") {
          portfolio[symbol] = (portfolio[symbol] || 0) + shareQuantity;
          const moniftyPrice = masterPrices
            .get("MONIFTY500")
            ?.find(
              (p) => p.date.getTime() === transactionDate.getTime()
            )?.closingPrice;
          if (moniftyPrice) {
            alternatePortfolio += (shareQuantity * sharePrice) / moniftyPrice;
          } else {
            console.warn(
              `No MONIFTY500 price found for date: ${transactionDate}`
            );
          }
        } else if (trade_type.toUpperCase() === "SELL") {
          portfolio[symbol] = (portfolio[symbol] || 0) - shareQuantity;
          const moniftyPrice = masterPrices
            .get("MONIFTY500")
            ?.find(
              (p) => p.date.getTime() === transactionDate.getTime()
            )?.closingPrice;
          if (moniftyPrice) {
            alternatePortfolio -= (shareQuantity * sharePrice) / moniftyPrice;
          } else {
            console.warn(
              `No MONIFTY500 price found for date: ${transactionDate}`
            );
          }
        }
      }
    });

    console.log("Portfolio after transactions:", portfolio);

    // Calculate portfolio value at month end
    let portfolioValue = 0;
    Object.entries(portfolio).forEach(([symbol, quantity]) => {
      const sharePrice = masterPrices
        .get(symbol)
        ?.find((p) => p.date.getTime() === monthEnd.getTime())?.closingPrice;
      if (sharePrice !== undefined) {
        portfolioValue += quantity * sharePrice;
        console.log(
          `${symbol}: ${quantity} shares @ ${sharePrice} = ${
            quantity * sharePrice
          }`
        );
      } else {
        console.warn(`No closing price found for ${symbol} on ${monthEnd}`);
      }
    });

    const moniftyEndPrice = masterPrices
      .get("MONIFTY500")
      ?.find((p) => p.date.getTime() === monthEnd.getTime())?.closingPrice;
    let alternateValue = 0;
    if (moniftyEndPrice !== undefined) {
      alternateValue = alternatePortfolio * moniftyEndPrice;
      console.log(
        `Alternate portfolio: ${alternatePortfolio} units @ ${moniftyEndPrice} = ${alternateValue}`
      );
    } else {
      console.warn(`No MONIFTY500 closing price found for ${monthEnd}`);
    }

    portfolioValues.push({
      date: monthEnd,
      portfolioValue,
      alternateValue,
      gain: ((portfolioValue - alternateValue) / alternateValue) * 100,
    });

    console.log(
      `Month end values: Portfolio = ${portfolioValue}, Alternate = ${alternateValue}, Gain = ${portfolioValues[
        portfolioValues.length - 1
      ].gain.toFixed(2)}%`
    );
  });

  return portfolioValues;
}

export default function UploadComponent() {
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<CSVRow[]>([]);
  const [filteredData, setFilteredData] = useState<CSVRow[]>([]);
  const [plotData, setPlotData] = useState<PlotDataPoint[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [insights, setInsights] = useState<string>("");
  // const [chartImage, setChartImage] = useState<string | null>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const uploadedFile = event.target.files[0];
      setFile(uploadedFile);

      Papa.parse<CSVRow>(uploadedFile, {
        complete: (results) => {
          setCsvData(results.data);
        },
        header: true,
      });
    }
  };

  const handleGenerate = async () => {
    if (!csvData.length) return;
    setIsLoading(true);
    try {
      const { filteredData } = processCSV(csvData);
      const allShares = Array.from(
        new Set([
          ...indexList,
          ...filteredData.map((row: { symbol: string }) => row.symbol),
        ])
      ) as string[];
      const prices = await getClosingPricesForShares(
        allShares,
        DURATION,
        MY_FILTER
      );
      const sixMonths = getSixMonths();
      const lastDays = getLastTradingDays(sixMonths, prices);
      const portfolioValues = generatePortfolioValues(
        filteredData,
        lastDays,
        prices
      );
      setFilteredData(filteredData);
      setPlotData(portfolioValues);

      // Wait for the chart to render
      setTimeout(async () => {
        await generateInsights();
      }, 1000); // 1 second delay
    } catch (error) {
      console.error("Error processing data:", error);
      setInsights(
        "Unable to generate insights at this time. Please try again later."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const generateInsights = async () => {
    const GOOGLE_GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API;
    const GOOGLE_GEMINI_AI_MODEL_NAME = "gemini-1.5-flash";
    console.log("GOOGLE_GEMINI_API_KEY:", GOOGLE_GEMINI_API_KEY);
    if (!GOOGLE_GEMINI_API_KEY) {
      console.error("Gemini API key is not set");
      setInsights("Unable to generate insights: API key is not set.");
      return;
    }

    try {
      //      const chartCanvas = await waitForChartRender();
      const chartImage = document.getElementById(
        "portfolioChart"
      ) as HTMLCanvasElement | null;

      if (!chartImage) {
        console.warn("Chart image element not found");
        setInsights(
          "Unable to generate insights: Chart not available. Please ensure the chart is rendered before generating insights."
        );
        return;
      }

      const imageData = chartImage.toDataURL("image/png").split(",")[1];
      //  setChartImage(imageData);
      const prompt =
        "You are a financial coach tasked with promoting financial insight and learning. The attached chart shows portfolio value compared to benchmark ETF NIFTY500 in India. Ask one question each as Warren Buffett, Charlie Munger and Morgan Housel would ask.";

      const genAI = new GoogleGenerativeAI(GOOGLE_GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({
        model: GOOGLE_GEMINI_AI_MODEL_NAME,
      });

      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: imageData,
            mimeType: "image/png",
          },
        },
      ]);

      const response = await result.response;
      const generatedInsights = response.text();

      setInsights(generatedInsights);
    } catch (error) {
      console.error("Error generating insights:", error);
      setInsights(
        "Unable to generate insights at this time. Please try again later."
      );
    }
  };

  // const generateInsights = async () => {
  //   try {
  //     const chartImage = document.getElementById('portfolioChart') as HTMLCanvasElement | null;

  //     if (!chartImage) {
  //       console.warn('Chart image element not found');
  //       setInsights("Unable to generate insights: Chart not available. Please ensure the chart is rendered before generating insights.");
  //       return;
  //     }

  //     const imageData = chartImage.toDataURL('image/png').split(',')[1];

  //     const prompt = "You are a financial coach tasked with promoting financial insight and learning. The attached chart shows portfolio value compared to benchmark ETF NIFTY500 in India. Ask one question each as Warren Buffett, Charlie Munger and Morgan Housel would ask.";

  //     const response = await fetch('/api/generate-insights', {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json',
  //       },
  //       body: JSON.stringify({ prompt, imageData }),
  //     });

  //     if (!response.ok) {
  //       throw new Error(`HTTP error! status: ${response.status}`);
  //     }

  //     const result = await response.json();
  //     setInsights(result.text);
  //   } catch (error) {
  //     console.error("Error generating insights:", error);
  //     setInsights("Unable to generate insights at this time. Please try again later.");
  //   }
  // };

  const renderChart = () => {
    if (!plotData || plotData.length === 0) return null;

    const data = {
      labels: plotData.map((d: { date: Date }) => d.date.toLocaleDateString()),
      datasets: [
        {
          label: "Portfolio Value",
          data: plotData.map(
            (d: { portfolioValue: number }) => d.portfolioValue
          ),
          borderColor: "rgb(75, 192, 192)",
          backgroundColor: "rgba(75, 192, 192, 0.5)",
          borderWidth: 3,
          pointRadius: 5,
          pointHoverRadius: 8,
          tension: 0.1,
        },
        {
          label: "MONIFTY500 Value",
          data: plotData.map(
            (d: { alternateValue: number }) => d.alternateValue
          ),
          borderColor: "rgb(255, 99, 132)",
          backgroundColor: "rgba(255, 99, 132, 0.5)",
          borderWidth: 3,
          pointRadius: 5,
          pointHoverRadius: 8,
          tension: 0.1,
        },
      ],
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "top" as const,
          labels: {
            padding: 40, // Significantly increase padding between legend items
            font: {
              size: 16, // Increase font size further
            },
            usePointStyle: true, // Use point style for legend items
            pointStyle: "circle", // Use circle style for points
          },
        },
        title: {
          display: true,
          text: "Portfolio Value (Green) vs MONIFTY500 (Red)",
          font: {
            size: 20, // Increase title font size
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: "Value",
            font: {
              size: 14,
            },
          },
        },
        x: {
          title: {
            display: true,
            text: "Date",
            font: {
              size: 14,
            },
          },
        },
      },
    };

    return (
      <div className="w-full h-full">
        <Line data={data} options={options} id="portfolioChart" />
      </div>
    );
  };
  return (
    <div className="w-full min-h-screen bg-white text-black p-6">
      <Card className="bg-white border-gray-200">
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <Input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="bg-white text-black border-gray-300"
              />
            </div>
            <Button
              onClick={handleGenerate}
              disabled={!file || isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading ? "Processing..." : "Generate"}
              {isLoading ? (
                <BarChart2 className="ml-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="ml-2 h-4 w-4" />
              )}
            </Button>
          </div>
          {file && (
            <p className="mb-4 text-black">Selected file: {file.name}</p>
          )}
          {plotData && plotData.length > 0 && (
            <Card className="bg-white border-gray-200 mb-6">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-black">
                  Portfolio Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="w-full h-[400px]" id="portfolioChart">
                  {renderChart()};
                </div>
              </CardContent>
            </Card>
          )}
          {insights && (
            <Card className="bg-white border-gray-200">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-black flex items-center">
                  <MessageSquare className="mr-2 h-5 w-5" />
                  AI Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  readOnly
                  value={insights}
                  className="w-full min-h-[150px] bg-white text-black border-gray-300 resize-none"
                />
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
