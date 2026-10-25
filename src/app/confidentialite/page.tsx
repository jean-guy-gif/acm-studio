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
              caractéristiques restent. En mode expert, le conseiller peut exporter le comparatif
              d’un dossier dans un tableur, pour son propre usage : l’adresse d’un concurrent n’y
              figure que s’il l’a lui-même confirmée ou saisie, et ce fichier, une fois enregistré
              sur son ordinateur, relève de l’agence.
            </li>
            <li>
              Les dossiers de prospection : quand un mandat est signé, le conseiller peut préparer
              un courrier à imprimer, adressé au propriétaire d’un bien concurrent — à l’adresse
              confirmée de ce bien — ou au confrère qui le vend. L’adresse sort donc d’ACM Studio
              sur ce courrier, remis par le conseiller. Le courrier adressé à un propriétaire porte
              une mention légale : le responsable du traitement (l’agence, avec son adresse),
              l’origine réelle de l’adresse (déterminée à partir de données publiques — diagnostic
              de performance énergétique, registre des copropriétés ou cadastre — et de l’annonce,
              que le conseiller l’ait confirmée ou non, ou relevée par le conseiller quand il l’a
              saisie ou corrigée), la finalité (proposer les services de l’agence pour la vente du
              bien), la durée de conservation, les droits d’accès, d’opposition et d’effacement avec
              le moyen de les exercer (le téléphone ou l’e-mail du conseiller), le droit de saisir
              la CNIL et l’adresse de cette page. Tout courrier porte aussi la carte professionnelle
              de l’agence et l’autorité qui l’a délivrée, puis sa garantie financière ou la mention
              « Ne peut recevoir aucun fonds ». Il ne reprend ni le nom du propriétaire, ni rien du
              vendeur. Il peut porter une photo tirée de l’annonce du bien concurrent, montrée telle
              quelle, au seul choix du conseiller (jamais par défaut) : elle appartient à son
              auteur. ACM Studio conserve les textes que le conseiller a réécrits ; il n’envoie
              lui-même aucun courrier.
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
              Les freins notés à la conclusion (le prix, l’exclusivité, le délai…) et une ligne
              libre : ils servent au conseiller pour sa relance et au manager de l’agence pour
              suivre la prise de mandat ; jamais à d’autres agences.
            </li>
            <li>
              Les fiches acquéreur : pour un acquéreur rencontré par l’agence, le conseiller note
              son nom, son téléphone et son e-mail s’il les donne, la raison et le calendrier de son
              achat, ce qu’il cherche (type de bien, communes, budget, pièces, surface, équipements)
              et ses critères indispensables ou éliminatoires, avec des notes libres. Ces fiches
              servent à rapprocher sa recherche des biens que l’agence connaît ; elles sont visibles
              par les seuls membres de l’agence, jamais par une autre agence ni par un vendeur. Le
              conseiller peut archiver une fiche : elle disparaît alors de l’outil et est effacée
              sur demande.
            </li>
            <li>
              La synthèse du rendez-vous laissée au vendeur : elle reprend, dans l’ordre du
              rendez-vous, les réponses qu’il a données (ses prix, ses réponses sur chaque bien
              concurrent, le concurrent qu’il a jugé le plus dangereux), le marché vu ensemble et le
              prix retenu, avec les photos de son bien. Chaque bien concurrent y figure par ses
              caractéristiques et une photo tirée de son annonce, montrée telle quelle — jamais son
              adresse, le titre ou le lien de l’annonce, ni l’agence qui le vend ; le conseiller
              peut retirer cette photo (« Sans photo »), du document comme du lien. Le conseiller
              peut l’imprimer ou créer un lien pour la lui envoyer : ce lien s’ouvre sans compte,
              n’est jamais indexé par les moteurs de recherche et expire après 30 jours. ACM Studio
              ne garde pas le lien lui-même, seulement de quoi le reconnaître, avec sa date
              d’expiration.
            </li>
            <li>
              Le dossier acquéreur : pour un acquéreur, le conseiller retient jusqu’à trois biens et
              lui remet un dossier qui reprend sa recherche et, pour chaque bien, ses
              caractéristiques, son prix affiché, pourquoi il correspond et ce qu’il faut savoir,
              avec une photo tirée de l’annonce ou du bien, montrée telle quelle — jamais l’adresse,
              le titre ou le lien d’une annonce, ni l’agence qui le vend ; le conseiller peut
              retirer cette photo (« Sans photo »). Le dossier s’imprime ou part par un lien qui
              s’ouvre sans compte, n’est jamais indexé et expire après 30 jours ; le conseiller peut
              le retirer. Sur ce lien, l’acquéreur peut répondre une fois, depuis son téléphone :
              pour chaque bien, le visiter, peut-être ou pas pour lui, avec la raison parmi une
              liste, et ses créneaux de visite parmi une liste ; ACM Studio n’enregistre que ces
              réponses, datées, pour le conseiller, sans compte ni adresse e-mail ; aucun texte
              libre.
            </li>
            <li>
              Les réponses de l’acquéreur : quand le conseiller lui présente sa sélection, il note,
              pour chaque bien, ce que l’acquéreur répond — le visiter, peut-être, pas pour lui —
              et, s’il n’en veut pas, la raison parmi une liste (le quartier, la surface,
              l’extérieur, le parking, le prix, les travaux, les photos, autre), ainsi que ses
              créneaux de visite parmi une liste ; aucun texte libre. Ces réponses sont datées, lues
              par la seule agence, et servent au conseiller à organiser les visites et à affiner la
              recherche : quand une même raison revient, la fiche lui propose un changement, qui ne
              s’applique que s’il l’accepte.
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
              transmis. Le dernier résultat d’une recherche est gardé sur le dossier, pour être
              rouvert sans nouvel appel ; il part avec le dossier.
            </li>
            <li>
              Sur le Suivi, « Mettre à jour les prix des concurrents » relit, par l’extension, les
              annonces des concurrents retenus : seuls le prix et la date du constat sont gardés.
            </li>
            <li>
              Pour inscrire à la main une adresse « Ne plus solliciter », ACM Studio demande à
              geo.api.gouv.fr la commune d’un code postal, ou vérifie le nom d’une commune : seul ce
              code postal ou ce nom lui est transmis, jamais la rue ni le numéro. Si le service ne
              répond pas, le nom de la commune tapé est gardé avec l’opposition, et revérifié la
              nuit suivante.
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
