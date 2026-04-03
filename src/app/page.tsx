// TEMPORARY: Auth bypass — always go to dashboard
import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/dashboard');
}
