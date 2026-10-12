import type { Metadata } from 'next';
import Link from 'next/link';

import { OWNER_ADDRESS_RETENTION_YEARS } from '@/features/prospecting-file/services/legal-mention';

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
              Le compte du conseiller : adresse e-mail, nom, agence et rôle et, s’il les renseigne,
              son téléphone et sa photo. L’identité de l’agence : nom, logo, couleurs et, si elles
              sont renseignées, adresse postale, carte professionnelle (numéro, autorité qui l’a
              délivrée) et garantie financière.
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
              Les adresses des biens concurrents : si le conseiller a installé le Localisateur
              Academia (une extension distincte) et y a activé « Partager avec ACM Studio », ACM
              Studio lui transmet l’adresse des annonces des concurrents retenus et conserve ce
              qu’il rend — l’adresse du bien, son niveau de confirmation et sa position. Le
              conseiller peut aussi confirmer cette adresse lui-même, ou la saisir. Usage de
              prospection par l’agence : ces adresses ne sont jamais montrées au vendeur. Durée de
              conservation : {OWNER_ADDRESS_RETENTION_YEARS} ans. Une adresse pour laquelle rien ne
              s’est passé depuis {OWNER_ADDRESS_RETENTION_YEARS} ans — ni dossier remis, ni
              rendez-vous, ni réponse du propriétaire, ni correction de l’adresse — est effacée
              automatiquement, chaque nuit, avec sa position ; l’annonce publique et ses
              caractéristiques restent.
            </li>
            <li>
              Les dossiers de prospection : quand un mandat est signé, le conseiller peut préparer
              un courrier à imprimer, adressé au propriétaire d’un bien concurrent — à l’adresse
              confirmée de ce bien — ou au confrère qui le vend. L’adresse sort donc d’ACM Studio
              sur ce courrier, remis par le conseiller. Le courrier adressé à un propriétaire porte
              une mention légale : le responsable du traitement (l’agence, avec son adresse),
              l’origine réelle de l’adresse (déterminée à partir de données publiques — diagnostic
              de performance énergétique, registre des copropriétés ou cadastre — et de l’annonce,
              ou relevée par le conseiller), la finalité (proposer les services de l’agence pour la
              vente du bien), la durée de conservation, les droits d’accès, d’opposition et
              d’effacement avec le moyen de les exercer (le téléphone ou l’e-mail du conseiller), le
              droit de saisir la CNIL et l’adresse de cette page. Tout courrier porte aussi la carte
              professionnelle de l’agence et l’autorité qui l’a délivrée, puis sa garantie
              financière ou la mention « Ne peut recevoir aucun fonds ». Il ne reprend ni le nom du
              propriétaire, ni rien du vendeur. Une photo du bien concurrent n’y figure que si le
              conseiller le choisit (« Sans photo » par défaut) : une photo de l’annonce, ou une
              photo qu’il importe lui-même. Elle est alors copiée dans le stockage de l’agence, et
              retirée quand le conseiller en choisit une autre ou supprime ce concurrent. ACM Studio
              conserve les textes que le conseiller a réécrits ; il n’envoie lui-même aucun
              courrier.
            </li>
            <li>
              La liste « Ne plus solliciter » : quand un propriétaire demande à ne plus être
              contacté, le conseiller inscrit le bien sur la liste d’opposition de son agence —
              depuis sa carte, ou en saisissant son adresse. ACM Studio en conserve l’adresse de
              l’immeuble, sous une forme simplifiée (sans étage ni appartement), le portail et le
              numéro de son annonce quand elle est connue, et la date de la demande — ni nom, ni
              autre donnée. Ce bien ne reçoit plus de courrier et ne figure plus dans les tournées,
              dans aucun dossier de l’agence, présent ou futur, et son adresse ne peut plus y être
              corrigée. Une demande d’effacement y inscrit aussi l’adresse. Cette liste n’est pas
              effacée au terme des {OWNER_ADDRESS_RETENTION_YEARS} ans : c’est elle qui permet de ne
              plus solliciter.
            </li>
            <li>
              Le rendez-vous : les réponses du vendeur enregistrées pendant la présentation, puis la
              conclusion notée par le conseiller.
            </li>
            <li>
              L’historique des relances : quand un vendeur est « à relancer », le conseiller note le
              motif de la relance, puis chaque relance qu’il fait. ACM Studio conserve la date de la
              relance, la note d’une ligne que le conseiller peut y joindre et le nom du conseiller
              qui l’a faite. Cet historique est visible par les seuls membres de l’agence ; il n’est
              jamais montré au vendeur. ACM Studio n’envoie lui-même aucun message au vendeur : il
              propose un texte, que le conseiller copie et envoie par ses propres moyens.
            </li>
            <li>
              Un journal technique : quand une erreur inattendue survient, ACM Studio enregistre sa
              date, la page concernée, un message technique, la version de l’outil et les
              identifiants de l’agence et du conseiller connecté. Le message est nettoyé avant
              d’être enregistré : il ne contient ni texte saisi, ni prix, ni adresse. Ce journal
              n’est lu que par l’éditeur, pour corriger l’outil. Il est conservé 90 jours : chaque
              nuit, les lignes plus anciennes sont supprimées automatiquement.
            </li>
            <li>
              Le compte des recherches de concurrents : pour chaque recherche lancée auprès de
              Stream Estate, le nombre d’annonces reçues, sa date, le dossier et le conseiller. Il
              sert à tenir le budget de recherche mensuel de l’agence.
            </li>
          </ul>
          <p className={paragraph}>
            Un dossier vendeur supprimé par le conseiller est archivé : il disparaît de l’outil,
            mais ses données restent conservées jusqu’à leur effacement, fait sur demande (voir «
            Qui contacter »).
          </p>
          <p className={paragraph}>
            Une fiche commerciale en PDF est lue dans le navigateur du conseiller : le fichier n’est
            pas envoyé, seul son texte l’est. Les données d’une agence ne sont visibles que par les
            membres de cette agence. ACM Studio dépose les cookies nécessaires à la connexion et au
            choix du thème, et aucun cookie publicitaire ou de mesure d’audience.
          </p>
        </section>

        <section className={`${card} flex flex-col gap-3 p-5 sm:p-6`}>
          <h2 className={sectionTitle}>Qui est responsable</h2>
          <p className={paragraph}>
            L’agence immobilière qui utilise ACM Studio est responsable du traitement des données de
            ses dossiers : vendeurs, biens, concurrents et prospection. {PUBLISHER_NAME}, éditeur
            d’ACM Studio, est son sous-traitant : il héberge et traite ces données pour le compte de
            l’agence.
          </p>
        </section>

        <section className={`${card} flex flex-col gap-3 p-5 sm:p-6`}>
          <h2 className={sectionTitle}>Où sont les données</h2>
          <ul className={list}>
            <li>Supabase : la base de données, les comptes et les photos des dossiers.</li>
            <li>Vercel : l’hébergement de l’application.</li>
            <li>
              Pour chercher des concurrents, ACM Studio transmet les critères de la recherche
              (commune, type de bien, surface, pièces, fourchette de prix, et la position du bien
              (coordonnées), pour chercher autour de lui) à Stream Estate, et l’adresse du bien aux
              services publics de géographie de l’État (api-adresse.data.gouv.fr, geo.api.gouv.fr)
              pour la situer. Ni le nom, ni l’e-mail, ni le téléphone du vendeur ne leur sont
              transmis.
            </li>
            <li>Les e-mails d’invitation sont envoyés par Google (messagerie de l’éditeur).</li>
          </ul>
        </section>

        <section className={`${card} flex flex-col gap-3 p-5 sm:p-6`}>
          <h2 className={sectionTitle}>Qui contacter</h2>
          <p className={paragraph}>
            Pour consulter, corriger ou faire supprimer des données qui vous concernent, ou pour
            vous opposer à un contact, adressez-vous à l’agence concernée, responsable du traitement
            : ses coordonnées figurent sur le courrier que vous avez reçu. Pour toute autre
            question, ou si vous ne savez pas quelle agence est concernée, écrivez à{' '}
            {PUBLISHER_NAME} :{' '}
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
