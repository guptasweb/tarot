import { NextResponse } from 'next/server'

export async function GET() {
  // Readings API implementation coming soon
  return NextResponse.json({ readings: [] })
}

export async function POST(request: Request) {
  // Create reading implementation coming soon
  return NextResponse.json({ message: 'Create reading endpoint' })
}
