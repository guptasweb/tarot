// Delete transcript

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '../../../../backend/lib/middleware/auth';
import { prisma } from '../../../../backend/lib/db/client';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await authenticateRequest(request);

  if (authResult instanceof NextResponse) {
    return authResult; // Error response
  }

  const { guestSessionId } = authResult;

  try {
    const transcript = await prisma.transcript.findUnique({
      where: { id: params.id },
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

    // TODO: Delete file from Cloudflare R2
    // await deleteFromR2(transcript.fileUrl);

    await prisma.transcript.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting transcript:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to delete transcript' },
      { status: 500 }
    );
  }
}
