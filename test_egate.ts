import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  datasourceUrl: "postgresql://tahi_booking:gsMIR0PPgbmyiIn@vps206.opalstack.com:5432/tahi_booking"
})

async function run() {
  const settings = await prisma.setting.findMany()
  const midSetting = settings.find(s => s.key === 'egate_merchant_id')
  const passSetting = settings.find(s => s.key === 'egate_shared_secret')
  const sandbox = settings.find(s => s.key === 'egate_sandbox')?.value === 'true'

  if (!midSetting || !passSetting) {
    console.error('Credentials not found in DB')
    return
  }

  const mid = midSetting.value
  const pass = passSetting.value
  const host = 'https://anzegate.gateway.mastercard.com'
  const url = `${host}/api/rest/version/100/merchant/${mid}/session`

  const auth = 'Basic ' + Buffer.from(`merchant.${mid}:${pass}`).toString('base64')

  const payloads = [
    { name: 'Generic Session', payload: { order: { id: 'test1', amount: '10.00', currency: 'TOP' } } },
    { name: 'INITIATE_CHECKOUT', payload: { apiOperation: 'INITIATE_CHECKOUT', order: { id: 'test2', amount: '10.00', currency: 'TOP' }, interaction: { operation: 'PURCHASE' } } },
    { name: 'CREATE_CHECKOUT_SESSION', payload: { apiOperation: 'CREATE_CHECKOUT_SESSION', order: { id: 'test3', amount: '10.00', currency: 'TOP' }, interaction: { operation: 'PURCHASE' } } },
  ];

  for (let p of payloads) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': auth },
      body: JSON.stringify(p.payload)
    });
    console.log(p.name + ':', res.status, await res.text());
  }
}
run().catch(console.error).finally(() => prisma.$disconnect())
