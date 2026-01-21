// Download transcript file

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '../../../../../../../backend/lib/middleware/auth';
import { prisma } from '../../../../../../../backend/lib/db/client';

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string; transcriptId: string } }
) {
  const authResult = await authenticateRequest(request);

  if (authResult instanceof NextResponse) {
    return authResult; // Error response
  }

  const { guestSessionId } = authResult;

  try {
    const transcript = await prisma.transcript.findUnique({
      where: { id: params.transcriptId },
    });

    if (!transcript) {
      return NextResponse.json(
        { error: 'Not found', message: 'Transcript not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (transcript.guestSessionId !== guestSessionId) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'You do not have access to this transcript' },
        { status: 403 }
      );
    }

    // Check expiry
    if (transcript.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Expired', message: 'Transcript has expired' },
        { status: 410 }
      );
    }

    // Update download count
    await prisma.transcript.update({
      where: { id: params.transcriptId },
      data: {
        downloadCount: { increment: 1 },
        lastDownloadedAt: new Date(),
      },
    });

    // TODO: Generate signed URL from Cloudflare R2
    // For now, return redirect URL
    return NextResponse.json({
      redirectUrl: transcript.fileUrl,
    });

    // Alternative: Stream file directly
    // const fileResponse = await fetch(transcript.fileUrl);
    // return new NextResponse(fileResponse.body, {
    //   headers: {
    //     'Content-Type': getContentType(transcript.format),
    //     'Content-Disposition': `attachment; filename="reading-${params.sessionId}.${transcript.format}"`,
    //   },
    // });
  } catch (error) {
    console.error('Error downloading transcript:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to download transcript' },
      { status: 500 }
    );
  }
}
