import ClientProviders from './providers';
import DashboardPage from './dashboard/DashboardPage';

export default function Home() {
  return (
    <ClientProviders>
      <DashboardPage />
    </ClientProviders>
  );
}
