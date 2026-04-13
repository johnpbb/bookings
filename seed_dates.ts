import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const dates = []
  for (let i = 0; i < 30; i++) {
    const d = new Date()
    d.setDate(d.getDate() + i)
    // Add dates except Sundays (0)
    if (d.getDay() !== 0) {
      dates.push({
        operatingDate: new Date(d.toISOString().slice(0, 10)),
        totalSeats: 16,
      })
    }
  }

  for (const date of dates) {
    await prisma.operatingDay.upsert({
      where: { operatingDate: date.operatingDate },
      update: {},
      create: date,
    })
  }
  console.log('Seeded 30 days of operating dates.')
}
main().finally(() => prisma.$disconnect())
