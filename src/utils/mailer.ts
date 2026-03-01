// @ts-nocheck
const createTransporter = () => {
  let nodemailer;
  try {
    // Lazy-load so app can boot even before dependency install.
    nodemailer = require('nodemailer');
  } catch (error) {
    throw new Error('nodemailer is not installed. Run `npm install` in bite-backend.');
  }

  const hasSmtpConfig =
    !!process.env.SMTP_HOST &&
    !!process.env.SMTP_PORT &&
    !!process.env.SMTP_USER &&
    !!process.env.SMTP_PASS;

  if (hasSmtpConfig) {
    const port = Number(process.env.SMTP_PORT);
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  throw new Error(
    'Missing mail configuration. Use SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS or EMAIL_USER/EMAIL_PASS.'
  );
};

const sendEmail = async ({ to, subject, html, text }) => {
  const transporter = createTransporter();
  const from = process.env.SMTP_FROM || process.env.EMAIL_FROM || process.env.EMAIL_USER;
  if (!from) {
    throw new Error('Missing sender email. Set SMTP_FROM, EMAIL_FROM, or EMAIL_USER.');
  }
  await transporter.sendMail({
    from,
    to,
    subject,
    text,
    html,
  });
};

module.exports = {
  sendEmail,
};

