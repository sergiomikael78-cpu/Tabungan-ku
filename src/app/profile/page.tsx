import ClientProviders from '../providers';
import ProfilePage from './ProfilePage';

export default function Page() {
  return (
    <ClientProviders>
      <ProfilePage />
    </ClientProviders>
  );
}
