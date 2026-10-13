import { NextResponse } from 'next/server';
import { authenticate, fail } from '@/lib/api';
import { getDashboardStats } from '@/lib/db';

export async function GET() {
  try {
    const { response } = await authenticate();
    if (response) return response;

    const stats = await getDashboardStats();

    return NextResponse.json({
      success: true,
      ...stats,
    }, {
      headers: {
        'Cache-Control': 'private, max-age=10, stale-while-revalidate=30',
      },
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    return fail('Failed to fetch stats', 500);
  }
}
