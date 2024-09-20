import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const stock_name = searchParams.get('stock_name');
  const period = searchParams.get('period');
  const filter = searchParams.get('filter');
  const API_KEY = process.env.STOCK_API;

  if (!API_KEY) {
    return NextResponse.json({ error: 'API key is not set' }, { status: 500 });
  }

  const url = `https://stock.indianapi.in/historical_data?stock_name=${stock_name}&period=${period}&filter=${filter}`;

  try {
    const response = await fetch(url, {
      headers: { 'X-Api-Key': API_KEY }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching stock data:', error);
    return NextResponse.json({ error: 'Failed to fetch stock data' }, { status: 500 });
  }
}
