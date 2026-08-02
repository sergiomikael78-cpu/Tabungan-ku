import ClientProviders from '../providers';
import HistoryPage from './HistoryPage';

export default function Page() {
  return (
    <ClientProviders>
      <HistoryPage />
    </ClientProviders>
  );
}
