import { prisma } from '../lib/db'

async function check() {
  const days = await prisma.operatingDay.findMany({
    where: { seatsHeld: { gt: 0 } },
    include: { bookingDates: { include: { booking: true } } }
  })
  
  for (const d of days) {
    console.log(`Date: ${d.operatingDate.toISOString().slice(0, 10)} - Held: ${d.seatsHeld}`)
    for (const bd of d.bookingDates) {
      if (bd.booking.status === 'pending_payment') {
        console.log(`  -> Booking ${bd.booking.id} (${bd.booking.reference}) is pending_payment. Expires: ${bd.booking.holdExpiresAt}`)
      } else {
        console.log(`  -> Booking ${bd.booking.id} (${bd.booking.reference}) is ${bd.booking.status}`)
      }
    }
  }
}

check().catch(console.error).finally(() => prisma.$disconnect())
