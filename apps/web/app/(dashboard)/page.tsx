// This file exists to prevent Next.js from having a blank "/" route within
// the (dashboard) route group. Real dashboard content is at /dashboard.
import { redirect } from 'next/navigation';

export default function DashboardGroupRoot() {
  redirect('/dashboard');
}
