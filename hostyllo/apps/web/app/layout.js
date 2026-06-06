import './globals.css'

export const metadata = {
  title: 'HOSTYLLO — Smart Hostel Management',
  description: "Pakistan's #1 AI-powered hostel management SaaS",
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
