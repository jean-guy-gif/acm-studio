import { notFound } from 'next/navigation';

import { StatTiles } from '@/components/socle/stat-tiles';
import { PersonRow, RowLink, TaskCard } from '@/components/socle/task-card';
import {
  chipGreen,
  chipNeutral,
  chipOrange,
  pillGreen,
  pillNeutral,
  pillOrange,
  socleBtnFilled,
  socleBtnOutline,
  socleBtnQuiet,
  socleCardBordered,
  socleKicker,
  socleSubtitle,
  socleTitle,
} from '@/components/ui/styles';

// La refonte, lot A — l'aperçu des blocs du socle, avec les exemples des maquettes. Il sert à juger
// le lot A sur l'essai, aux trois tailles, avant que les lots B à F ne se servent de ces blocs.
// Introuvable en production ; la page est retirée à la fin de la refonte (lot F).
export const metadata = { title: 'Le socle — ACM Studio' };

const block = 'flex flex-col gap-3';
const blockTitle = 'text-[17px] font-extrabold text-brand-darker stage:text-white';

export default function SoclePreviewPage() {
  if (process.env.VERCEL_ENV === 'production') notFound();

  return (
    <div className="flex max-w-3xl flex-col gap-8" data-testid="socle-preview">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <h1 className={socleTitle}>Acquéreurs</h1>
          <p className={socleSubtitle}>3 choses à faire aujourd’hui</p>
        </div>
        <button type="button" className={socleBtnQuiet}>
          <span aria-hidden>+</span> Nouveau
        </button>
      </div>

      <section className={block}>
        <h2 className={blockTitle}>
          La carte « à faire » : une par personne, un seul bouton plein
        </h2>
        <div className="flex flex-col gap-3 md:max-w-md">
          <TaskCard
            name="M. et Mme Mercier"
            task="4 nouveaux biens pour eux"
            action={
              <button type="button" className={socleBtnFilled}>
                Voir les biens
              </button>
            }
          />
          <TaskCard
            name="Mme Rossi"
            task="Veut visiter la maison de Mougins"
            action={
              <button type="button" className={socleBtnOutline}>
                Proposer un créneau
              </button>
            }
          />
          <TaskCard
            name="M. Fontaine"
            task="Financement à valider avant de visiter"
            action={
              <button type="button" className={socleBtnOutline}>
                L’appeler
              </button>
            }
          />
          <RowLink href="/acquereurs" label="Tous mes acquéreurs" count={12} />
        </div>
      </section>

      <section className={block}>
        <h2 className={blockTitle}>La même personne en ligne, dans la colonne de gauche</h2>
        <div className="flex flex-col gap-2.5 md:max-w-md">
          <PersonRow
            href="/socle"
            name="M. et Mme Garnier"
            task="2 prix ont changé depuis votre préparation"
            selected
          />
          <PersonRow href="/socle" name="M. Lambert" task="Un concurrent a baissé de 20 000 €" />
        </div>
      </section>

      <section className={block}>
        <h2 className={blockTitle}>La prochaine étape, puis trois chiffres</h2>
        <div
          className={`${socleCardBordered} flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between md:gap-8`}
        >
          <div className="flex flex-col gap-2">
            <span className={socleKicker}>Prochaine étape</span>
            <p className="text-[21px] leading-snug font-bold text-brand-darker stage:text-white">
              2 annonces concurrentes ont changé de prix depuis votre préparation.
            </p>
          </div>
          <span className={`${socleBtnOutline} md:w-60 md:flex-none`}>Vérifier les annonces</span>
        </div>
        <StatTiles
          tiles={[
            { value: 6, label: 'Concurrents retenus' },
            { value: 2, label: 'Prix à revérifier', tone: 'watch' },
            { value: 5, label: 'Acquéreurs prêts à visiter', tone: 'good' },
          ]}
        />
      </section>

      <section className={block}>
        <h2 className={blockTitle}>Les pastilles : à lire, puis à toucher</h2>
        <div className="flex flex-wrap gap-2">
          <span className={pillOrange}>Piscine</span>
          <span className={pillGreen}>« au calme » dans l’annonce</span>
          <span className={pillNeutral}>Mougins</span>
          <span className={pillNeutral}>2 pièces de plus</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={chipNeutral}>
            Maison
          </button>
          <button type="button" className={chipNeutral}>
            Jusqu’à 1 700 000 €
          </button>
          <button type="button" className={chipGreen}>
            Au calme
          </button>
          <button type="button" className={chipOrange}>
            Indispensable : piscine
          </button>
        </div>
      </section>
    </div>
  );
}
