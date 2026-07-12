import { signOut } from '@/app/login/actions';

export default function ProtectedPage() {
  return (
    <div>
      <p>Authenticated</p>
      <form action={signOut}>
        <button type="submit">Déconnexion</button>
      </form>
    </div>
  );
}
