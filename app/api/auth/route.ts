import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  // Auth API implementation coming soon
  return NextResponse.json({ message: 'Auth endpoint' })
}
