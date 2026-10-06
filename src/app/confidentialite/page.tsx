import type { Metadata } from 'next';
import Link from 'next/link';

import { card, hintText, kickerLabel, link, pageTitle, sectionTitle } from '@/components/ui/styles';
import { PRIVACY_CONTACT_EMAIL, PUBLISHER_NAME } from '@/lib/legal';

// Mission 73 — page PUBLIQUE (sans connexion, voir lib/supabase/public-paths) : le Chrome Web
// Store exige une politique de confidentialité à une adresse lisible par tous. Elle ne lit ni la
// session ni la base : rien d'une agence ne peut s'y afficher.
export const metadata: Metadata = {
  title: 'Confidentialité — ACM Studio',
  description: 'Ce que lit l’extension ACM Studio, ce qu’ACM Studio conserve, et qui contacter.',
};

const paragraph = 'text-sm leading-relaxed text-zinc-700';
const list = `${paragraph} flex list-disc flex-col gap-1.5 pl-5`;

export default function ConfidentialitePage() {
  return (
    <main className="flex flex-1 justify-center bg-gradient-to-b from-brand-soft/60 to-white px-4 py-10">
      <div className="flex w-full max-w-3xl flex-col gap-6">
        <header className="flex flex-col gap-2">
          <span className={kickerLabel}>ACM Studio</span>
          <h1 className={pageTitle}>Confidentialité</h1>
          <p className={paragraph}>
            ACM Studio est un outil de préparation et de conduite du rendez-vous vendeur, destiné
            aux conseillers immobiliers. Il est édité par {PUBLISHER_NAME}. Cette page dit ce que
            lit l’extension Chrome « ACM Studio — Accès annonces », ce qu’ACM Studio conserve, où se
            trouvent les données et qui contacter.
          </p>
        </header>

        <section className={`${card} flex flex-col gap-3 p-5 sm:p-6`}>
          <h2 className={sectionTitle}>Ce que lit l’extension</h2>
          <p className={paragraph}>
            L’extension ne fait rien d’elle-même : elle agit seulement quand le conseiller clique
            dans ACM Studio (importer une annonce, ouvrir ses recherches, lire ses recherches).
          </p>
          <ul className={list}>
            <li>
              Elle lit le contenu de pages d’annonces et de pages de résultats de recherche sur cinq
              sites immobiliers, et sur aucun autre : SeLoger, Bien’ici, Green Acres, Figaro
              Immobilier, Maisons et Appartements.
            </li>
            <li>
              Elle lit le fichier <code>robots.txt</code> de ces sites, pour qu’ACM Studio respecte
              leurs règles avant de demander une page.
            </li>
            <li>
              Elle repère, parmi les onglets ouverts, ceux qui affichent une recherche sur ces sites
              (adresse et titre de l’onglet), et peut ouvrir des onglets de recherche déjà filtrés.
            </li>
          </ul>
          <p className={paragraph}>
            Elle ne lit pas votre historique, vos autres onglets, vos mots de passe ni vos
            formulaires. Elle ne conserve rien. La page lue est transmise à ACM Studio, à la page
            qui l’a demandée, et à personne d’autre. Rien n’est vendu, rien ne sert à de la
            publicité.
          </p>
        </section>

        <section className={`${card} flex flex-col gap-3 p-5 sm:p-6`}>
          <h2 className={sectionTitle}>Ce qu’ACM Studio conserve</h2>
          <ul className={list}>
            <li>
              Le compte du conseiller : adresse e-mail, nom, agence et rôle. L’identité de l’agence
              : nom, logo, couleurs.
            </li>
            <li>
              Les dossiers vendeur : le nom du vendeur et, si le conseiller les saisit, son e-mail
              et son téléphone ; le bien (adresse, caractéristiques, photos déposées par le
              conseiller) ; la fourchette et l’analyse du conseiller.
            </li>
            <li>
              Les concurrents retenus : les informations publiées dans l’annonce (prix, surface,
              pièces, description, photos, adresse de l’annonce) et la date à laquelle elles ont été
              relevées. La page lue par l’extension n’est pas conservée : seules ces informations en
              sont extraites.
            </li>
            <li>
              Le rendez-vous : les réponses du vendeur enregistrées pendant la présentation, puis la
              conclusion notée par le conseiller.
            </li>
          </ul>
          <p className={paragraph}>
            Une fiche commerciale en PDF est lue dans le navigateur du conseiller : le fichier n’est
            pas envoyé, seul son texte l’est. Les données d’une agence ne sont visibles que par les
            membres de cette agence. ACM Studio dépose les cookies nécessaires à la connexion et au
            choix du thème, et aucun cookie publicitaire ou de mesure d’audience.
          </p>
        </section>

        <section className={`${card} flex flex-col gap-3 p-5 sm:p-6`}>
          <h2 className={sectionTitle}>Où sont les données</h2>
          <ul className={list}>
            <li>Supabase : la base de données, les comptes et les photos des dossiers.</li>
            <li>Vercel : l’hébergement de l’application.</li>
            <li>
              Pour chercher des concurrents, ACM Studio transmet les critères de la recherche
              (commune, type de bien, surface, pièces, fourchette de prix, secteur) à Stream Estate,
              et l’adresse du bien aux services publics de géographie de l’État
              (api-adresse.data.gouv.fr, geo.api.gouv.fr) pour la situer. Ni le nom ni les
              coordonnées du vendeur ne leur sont transmis.
            </li>
            <li>Les e-mails d’invitation sont envoyés par Google (messagerie de l’éditeur).</li>
          </ul>
        </section>

        <section className={`${card} flex flex-col gap-3 p-5 sm:p-6`}>
          <h2 className={sectionTitle}>Qui contacter</h2>
          <p className={paragraph}>
            Pour toute question, ou pour consulter, corriger ou faire supprimer des données qui vous
            concernent, écrivez à {PUBLISHER_NAME} :{' '}
            <a href={`mailto:${PRIVACY_CONTACT_EMAIL}`} className={link}>
              {PRIVACY_CONTACT_EMAIL}
            </a>
            .
          </p>
        </section>

        <p className={hintText}>
          <Link href="/login" className={link}>
            Retour à la connexion
          </Link>
        </p>
      </div>
    </main>
  );
}
