// Credit management database operations

import { prisma } from './client';
import { CreditTransactionType, PaymentStatus } from '../types/database';

/**
 * Add credits to a guest session (after successful payment)
 */
export async function addCreditsToGuestSession(
  guestSessionId: string,
  credits: number,
  priceCents: number,
  stripePaymentIntentId: string,
  stripeCheckoutSessionId: string,
  paymentStatus: PaymentStatus = 'succeeded'
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // Update guest session credits
    const updatedSession = await tx.guestSession.update({
      where: { id: guestSessionId },
      data: {
        creditsBalance: {
          increment: credits,
        },
        totalCreditsPurchased: {
          increment: credits,
        },
      },
    });

    // Create transaction record
    await tx.creditTransaction.create({
      data: {
        guestSessionId,
        type: 'purchase',
        amount: credits,
        balanceAfter: updatedSession.creditsBalance,
        priceCents,
        stripePaymentIntentId,
        stripeCheckoutSessionId,
        paymentStatus,
      },
    });
  });
}

/**
 * Get credit transactions for a guest session
 */
export async function getCreditTransactions(guestSessionId: string) {
  return prisma.creditTransaction.findMany({
    where: { guestSessionId },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Get credit balance for a guest session
 */
export async function getCreditBalance(guestSessionId: string): Promise<number> {
  const guestSession = await prisma.guestSession.findUnique({
    where: { id: guestSessionId },
    select: { creditsBalance: true },
  });

  return guestSession?.creditsBalance ?? 0;
}

/**
 * Check if guest session has sufficient credits
 */
export async function hasSufficientCredits(
  guestSessionId: string,
  requiredCredits: number
): Promise<boolean> {
  const balance = await getCreditBalance(guestSessionId);
  return balance >= requiredCredits;
}

/**
 * Refund credits (admin operation)
 */
export async function refundCredits(
  transactionId: string,
  reason: string
): Promise<void> {
  const transaction = await prisma.creditTransaction.findUnique({
    where: { id: transactionId },
  });

  if (!transaction || transaction.type !== 'purchase') {
    throw new Error('Invalid transaction for refund');
  }

  await prisma.$transaction(async (tx) => {
    // Update guest session credits
    const updatedSession = await tx.guestSession.update({
      where: { id: transaction.guestSessionId },
      data: {
        creditsBalance: {
          decrement: transaction.amount,
        },
        totalCreditsPurchased: {
          decrement: transaction.amount,
        },
      },
    });

    // Create refund transaction
    await tx.creditTransaction.create({
      data: {
        guestSessionId: transaction.guestSessionId,
        type: 'refund',
        amount: -transaction.amount,
        balanceAfter: updatedSession.creditsBalance,
        priceCents: transaction.priceCents,
        stripePaymentIntentId: transaction.stripePaymentIntentId,
        stripeCheckoutSessionId: transaction.stripeCheckoutSessionId,
        paymentStatus: 'refunded',
        refundReason: reason,
        refundedTransactionId: transactionId,
      },
    });
  });
}
