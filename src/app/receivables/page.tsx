import ClientProviders from '../providers';
import ReceivablesPage from './ReceivablesPage';

export default function Page() {
  return (
    <ClientProviders>
      <ReceivablesPage />
    </ClientProviders>
  );
}
