// Mission 49 — le bloc de l'annonce principale, par portail.
//
// La règle de la mission : rien ne se lit dans la page entière. La description ET
// les photos se collectent DANS le bloc de l'annonce, jamais sur la page, où les
// cartes « biens similaires » portent la description et les photos d'un AUTRE bien
// (mesuré : SeLoger importait 8 photos de voisins sur 12). Ce module rend, par
// portail, la tranche HTML qui contient l'annonce principale et rien d'elle.
//
// Ancres MESURÉES le 16/09/2026 sur les fixtures réelles (positions de caractères) :
//   Green Acres  — cartes voisines « announce-info » à 210 537
//   Bien'ici     — carrousel « vue-similar-ads » à 203 546
//   SeLoger      — section recommandée / « SimilarListings » à ~440 237
//   Maisons et Appartements — les photos des voisins sont IMBRIQUÉES dans les nôtres
//     (nos images du groupe 5045398 vont jusqu'à 223 885, les voisines 5045136/
//     5045230/5045239 tombent à 155 457–160 053) : aucun découpage positionnel ne
//     les sépare. Le cadrage y est STRUCTUREL (l'extracteur cadre par l'id de groupe
//     de l'image principale), donc ce module ne rend rien à ratisser — '' —, et la
//     lecture s'appuie sur les champs cadrés de l'extracteur.
//
// Le libellé vient de detect-source. Un portail non listé rend '' : pas de lecture
// pleine page en repli (§3, le niveau 3 est supprimé). Mieux vaut vide que le voisin.

const NEIGHBOUR_ANCHORS: Record<string, RegExp> = {
  'Green Acres': /class="(?:announce-info|info-price-container)"/i,
  "Bien'ici": /vue-similar-ads/i,
  SeLoger: /SimilarListings|recommand[ée]/i,
};

// Maisons et Appartements : les photos des voisins sont IMBRIQUÉES dans les nôtres,
// aucun découpage positionnel ne les sépare — le cadrage y est STRUCTUREL (l'id de
// groupe de l'image principale, dans l'extracteur), donc ce module ne rend rien à
// ratisser sur la page.
const STRUCTURALLY_SCOPED = new Set(['Maisons et Appartements']);

export function mainAdvertRegion(html: string, source: string): string {
  const anchor = NEIGHBOUR_ANCHORS[source];
  if (anchor) {
    const match = anchor.exec(html);
    return match ? html.slice(0, match.index) : html;
  }
  if (STRUCTURALLY_SCOPED.has(source)) {
    return '';
  }
  // Portail inconnu : aucun carrousel connu à écarter — la page EST l'annonce.
  // On ne prive pas ces imports de leur description et de leurs photos.
  return html;
}
