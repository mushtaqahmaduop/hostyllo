import { NextResponse, type NextRequest } from 'next/server';

import { apiRaw, ApiError } from '@/lib/api';

/**
 * `GET /payments/:id/receipt` — the rent receipt, proxied.
 *
 * The browser cannot call the API directly (the access token lives in an httpOnly
 * cookie this app owns, and the API is a different site), so the row's receipt
 * button points here and this hands the PDF back unchanged.
 *
 * Streamed rather than buffered: `res.body` is passed straight through, so a
 * receipt never sits in this process's memory. The upstream content headers are
 * forwarded for the same reason — the API decides the filename and the
 * disposition, and a receipt that downloads under a different name on the web
 * than it does anywhere else is a support call waiting to happen.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Rejected here rather than forwarded: the API's own uuid format check would
  // return a 400 that this route would then dress up as a failed receipt.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return new NextResponse('Not found', { status: 404 });
  }

  let upstream: Response;
  try {
    upstream = await apiRaw(`/payments/${id}/receipt`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return new NextResponse('Could not fetch the receipt. Try again.', { status: 502 });
  }

  if (!upstream.ok) {
    // A cross-tenant or missing payment is a 404 from the API by design, and it
    // stays a 404 here — telling the operator which of the two it was would make
    // this endpoint an oracle for ids in another hostel.
    if (upstream.status === 404) return new NextResponse('Receipt not found', { status: 404 });
    if (upstream.status === 403) {
      return new NextResponse('Your role cannot open receipts.', { status: 403 });
    }
    return new NextResponse('Could not fetch the receipt. Try again.', { status: 502 });
  }

  return new NextResponse(upstream.body, {
    headers: {
      'Content-Type': upstream.headers.get('content-type') ?? 'application/pdf',
      'Content-Disposition':
        upstream.headers.get('content-disposition') ?? `inline; filename="receipt-${id}.pdf"`,
      'Cache-Control': 'no-store',
    },
  });
}
