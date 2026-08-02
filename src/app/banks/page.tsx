import ClientProviders from '../providers';
import BanksPage from './BanksPage';

export default function Page() {
  return (
    <ClientProviders>
      <BanksPage />
    </ClientProviders>
  );
}
