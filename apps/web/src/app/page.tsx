import { redirect } from 'next/navigation';

// The app has no marketing surface: signed in goes to the dashboard, signed out is caught by
// middleware and sent to /login.
export default function Home() {
  redirect('/dashboard');
}
