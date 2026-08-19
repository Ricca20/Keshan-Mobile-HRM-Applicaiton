import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
})

export async function sendNotificationEmail({
  to,
  subject,
  html,
}: {
  to: string
  subject: string
  html: string
}) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('⚠️ SMTP credentials not found. Skipping email sending.')
    return
  }

  try {
    await transporter.sendMail({
      from: `"PhoneShop HRM" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    })
  } catch (error) {
    console.error('Failed to send email notification:', error)
  }
}
