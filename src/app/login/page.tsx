import { login } from './actions';

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;

  return (
    <div>
      <h1>Connexion</h1>
      {error ? <p role="alert">{error}</p> : null}
      <form action={login}>
        <label>
          Email
          <input type="email" name="email" required />
        </label>
        <label>
          Mot de passe
          <input type="password" name="password" required />
        </label>
        <button type="submit">Connexion</button>
      </form>
    </div>
  );
}
