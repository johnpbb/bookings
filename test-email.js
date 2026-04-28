const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
dotenv.config();

async function main() {
  console.log('Testing SMTP with:', process.env.SMTP_HOST);
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT ?? '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    debug: true, // Show detailed handshake logs
    logger: true
  });
  
  try {
    await transport.sendMail({
      from: process.env.SMTP_FROM,
      to: 'johnpbb@gmail.com', // <-- I put your email here, change if needed!
      subject: 'Tahi Tonga SMTP Test',
      text: 'If you see this, SMTP is working!'
    });
    console.log('SUCCESS: Email sent!');
  } catch (err) {
    console.error('FAILED:', err);
  }
}
main();
