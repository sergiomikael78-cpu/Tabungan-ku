import ClientProviders from '../../providers';
import BankDetailPage from './BankDetailPage';

export default function Page() {
  return (
    <ClientProviders>
      <BankDetailPage />
    </ClientProviders>
  );
}
