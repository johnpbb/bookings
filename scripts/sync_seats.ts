import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function syncSeats() {
  console.log('Starting seat sync across all operating days...')

  const operatingDays = await prisma.operatingDay.findMany({
    include: {
      bookingDates: {
        include: {
          booking: true,
        },
      },
    },
  })

  let fixedCount = 0

  for (const day of operatingDays) {
    let actualHeld = 0
    let actualBooked = 0

    for (const bd of day.bookingDates) {
      if (bd.booking.status === 'pending_payment') {
        actualHeld += bd.seatsReserved
      } else if (bd.booking.status === 'confirmed') {
        actualBooked += bd.seatsReserved
      }
    }

    if (day.seatsHeld !== actualHeld || day.seatsBooked !== actualBooked) {
      console.log(
        `Date ${day.operatingDate.toISOString().slice(0, 10)} mismatch: ` +
        `Held (${day.seatsHeld} -> ${actualHeld}), Booked (${day.seatsBooked} -> ${actualBooked})`
      )

      await prisma.operatingDay.update({
        where: { id: day.id },
        data: {
          seatsHeld: actualHeld,
          seatsBooked: actualBooked,
        },
      })
      fixedCount++
    }
  }

  console.log(`Sync complete. Fixed ${fixedCount} corrupted operating days.`)
}

syncSeats()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
