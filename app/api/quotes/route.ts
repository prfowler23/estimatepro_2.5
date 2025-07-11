import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  return NextResponse.json({ message: 'Get quotes endpoint' })
}

export async function POST(request: NextRequest) {
  return NextResponse.json({ message: 'Create quote endpoint' })
}