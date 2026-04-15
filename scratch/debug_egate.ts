import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testEgate() {
  const settings = await prisma.setting.findMany();
  const mid = settings.find(s => s.key === 'egate_merchant_id')?.value;
  const pass = settings.find(s => s.key === 'egate_shared_secret')?.value;
  const sandbox = settings.find(s => s.key === 'egate_sandbox')?.value === 'true';

  console.log('Using MID:', mid);
  console.log('Using Pass:', pass ? '********' : 'MISSING');
  console.log('Sandbox:', sandbox);

  if (!mid || !pass) {
    console.error('Credentials missing');
    return;
  }

  const host = 'https://anzegate.gateway.mastercard.com';
  const versions = ['61', '100'];
  const operations = ['CREATE_CHECKOUT_SESSION', 'INITIATE_CHECKOUT'];

  for (const version of versions) {
    const url = `${host}/api/rest/version/${version}/merchant/${mid}/session`;
    for (const apiOperation of operations) {
      console.log(`\nTesting Version: ${version}, Operation: ${apiOperation}`);
      const payload = {
        apiOperation,
        interaction: {
          operation: 'PURCHASE',
          returnUrl: 'http://localhost:3000/booking/result?order_id=TEST',
        },
        order: {
          id: 'TEST-' + Date.now().toString().slice(-6),
          amount: '10.00',
          currency: 'TOP',
        },
      };

      const auth = 'Basic ' + Buffer.from(`merchant.${mid}:${pass}`).toString('base64');

      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': auth,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        console.log('Status:', res.status);
        const text = await res.text();
        console.log('Response:', text);
      } catch (err) {
        console.error('Fetch error:', err.message);
      }
    }
  }
}

testEgate().finally(() => prisma.$disconnect());
