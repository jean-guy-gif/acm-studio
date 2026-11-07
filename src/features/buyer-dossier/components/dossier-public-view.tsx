import { BuyerDossierDocument } from '@/features/buyer-dossier/components/buyer-dossier-document';
import { DossierPhoneDeck } from '@/features/buyer-dossier/components/dossier-phone-deck';
import type { BuyerDossier } from '@/features/buyer-dossier/types';

// Mission 122 (partie B) — la page du lien : le déroulé sur téléphone, aux couleurs de l'agence ;
// sa réponse déjà envoyée s'affiche à la seconde ouverture, sans pouvoir répondre deux fois ; la
// présentation terminée, « Ce que nous avons vu ensemble ». « Télécharger en PDF » imprime le
// dossier, présent dans la page, hors de l'écran (décision de Jean-Guy, 25/10) : à l'impression,
// le déroulé disparaît et le document seul paraît.
export function DossierPublicView({ token, dossier }: { token: string; dossier: BuyerDossier }) {
  return (
    <div data-dossier="" className="print:bg-white">
      {dossier.brandDeclarations ? (
        <style
          dangerouslySetInnerHTML={{ __html: `[data-dossier]{${dossier.brandDeclarations}}` }}
        />
      ) : null}
      <div className="print:hidden" data-testid="dossier-screen">
        <DossierPhoneDeck
          token={token}
          deck={dossier.deck}
          answered={dossier.answered}
          initialAnswers={dossier.answers}
          initialAvailability={dossier.availability}
          meetingAnswers={dossier.meetingAnswers}
          meetingAvailability={dossier.meetingAvailability}
          agencyName={dossier.agency.name}
          logoUrl={dossier.agency.logoUrl}
          advisorName={dossier.agency.advisorName}
          advisorPhone={dossier.agency.advisorPhone}
          advisorEmail={dossier.agency.advisorEmail}
          livingHere={dossier.livingHere ?? []}
        />
      </div>
      {/* Hors de l'écran mais rendu, pour que ses photos soient chargées avant d'imprimer ; seul
          à l'impression. */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed top-0 -left-[10000px] w-[210mm] print:static print:w-auto"
        data-testid="dossier-print"
      >
        <BuyerDossierDocument dossier={dossier} />
      </div>
    </div>
  );
}
