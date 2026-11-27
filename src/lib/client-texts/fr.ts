import { FRENCH_STUDY } from '@/lib/client-texts/study-fr';
import {
  COMPARISON_CRITERION_LABELS,
  DANGEROUS_REASON_LABELS,
  MARKET_DURATION_REASON_LABELS,
  PRICE_COHERENCE_LABELS,
  PROPERTY_CONFIRMED_LABELS,
  SERIOUS_COMPETITOR_LABELS,
} from '@/features/live-seller/constants';
import {
  EXPOSURE_LABELS,
  GENERAL_CONDITION_LABELS,
  HEATING_TYPE_LABELS,
  OUTDOOR_SPACE_LABELS,
  PARKING_TYPE_LABELS,
  PROPERTY_TYPE_LABELS,
} from '@/features/subject-property/constants/property-options';
import {
  AVAILABILITY_LABELS,
  GRID_ANSWER_LABELS,
  GRID_LEGEND_MARKS,
  ITEM_ANSWER_LABELS,
  NO_REASON_LABELS,
} from '@/features/buyer-deck/types';
import {
  DOSSIER_ALREADY_ANSWERED,
  DOSSIER_CHOICES_TITLE,
  DOSSIER_DISCLAIMER,
  DOSSIER_DOWNLOAD,
  DOSSIER_NO_ANSWER,
  DOSSIER_PRESENTED,
  DOSSIER_SEEN_TOGETHER,
  DOSSIER_SEND,
  DOSSIER_THANKS,
} from '@/features/buyer-dossier/types';
import { PRICE_TO_CONFIRM } from '@/features/buyer-presentation/services/agency-price';
import { BUYER_CRITERION_LABELS } from '@/features/buyers/types';
import { PRICE_ALIGNMENT_LABELS } from '@/features/price-positioning/services/price-alignment';
import { CONNECTION_LOST_MESSAGE } from '@/features/live-seller/services/guarded-save';
import { budgetStepLabel } from '@/features/buyers/services/budget-steps';
import type {
  NeighbourhoodBlockKey,
  PlanningCategory,
} from '@/features/neighbourhood-link/services/neighbourhood-blocks';
import type { ClientTexts } from '@/lib/client-texts/types';
import { formatNumber } from '@/lib/format';

// Mission 140 — le français, la langue par défaut : les listes reprennent celles de l'outil (une
// seule source), les phrases sont celles qui étaient écrites dans les écrans, mot pour mot.
// Mission 148 B — « dont N vus ensemble » (M112), quand des concurrents hors Live entrent au calcul.
function seenTogetherFr(count: number, seen: number | null): string {
  return seen != null && seen < count ? `, dont ${seen} vu${seen > 1 ? 's' : ''} ensemble` : '';
}

export const FRENCH_TEXTS: ClientTexts = {
  labels: {
    propertyType: PROPERTY_TYPE_LABELS,
    exposure: EXPOSURE_LABELS,
    condition: GENERAL_CONDITION_LABELS,
    heating: HEATING_TYPE_LABELS,
    outdoor: OUTDOOR_SPACE_LABELS,
    parking: PARKING_TYPE_LABELS,
  },
  common: {
    rooms: (count) => `${count} pièce${count > 1 ? 's' : ''}`,
    competitorFallback: 'Bien concurrent',
    yourAnswer: 'Votre réponse',
    commentOptional: 'Commentaire (facultatif)',
    addComment: '+ Ajouter un commentaire',
    questionMark: '\u00a0?',
    unknownLocation: 'Localisation inconnue',
    linkGone: {
      title: 'Ce lien n’est plus valable',
      body: (what, feminine) =>
        `${what} a été ${feminine ? 'retirée' : 'retiré'}, ou son lien a expiré : il est valable 30 jours. Pour le recevoir de nouveau, demandez-le à votre conseiller.`,
      what: {
        synthesis: 'Le dossier de rendez-vous',
        marketUpdate: 'Le Point marché',
        marketStudy: 'L’Étude de marché',
        dossier: 'Le dossier',
        offer: 'L’offre d’achat',
        voucher: 'Le bon de visite',
      },
    },
    photos: {
      noneForListing: 'Photos indisponibles pour cette annonce',
      unavailable: 'Photo indisponible pour cette annonce',
      short: 'Indispo.',
      enlarge: (count) => `Agrandir les photos (${count})`,
      photoOf: (index, count) => `Photo ${index} sur ${count}`,
      viewer: 'Visionneuse photo',
      close: 'Fermer',
      previous: 'Photo précédente',
      next: 'Photo suivante',
    },
    priceBasis: {
      advisorOnly: 'Prix retenu par votre conseiller',
      advisorFrom: (competitors) => `Prix retenu par votre conseiller à partir de ${competitors}`,
      calculatedOn: (competitors) => `Calculé sur ${competitors}`,
      competitors: (count, seen) =>
        `${count} concurrent${count > 1 ? 's' : ''}${
          seen != null && seen < count ? `, dont ${seen} vu${seen > 1 ? 's' : ''} ensemble` : ''
        }`,
    },
    grid: {
      title: 'Face à votre bien, critère par critère',
      empty: 'Les critères comparables ne sont pas disponibles pour ce concurrent.',
      criteria: COMPARISON_CRITERION_LABELS,
      status: {
        same: 'Équivalent',
        competitor_advantage: 'Avantage pour lui',
        competitor_weakness: 'Avantage pour vous',
        unknown: 'Non renseigné',
      },
      none: 'Aucun',
      legend: {
        green: 'vert',
        grey: 'gris',
        orange: 'orange',
        forYou: 'avantage pour vous',
        equivalent: 'équivalent',
        forThem: 'avantage pour lui',
      },
      chipStatus: { competitor_weakness: 'pour vous', competitor_advantage: 'pour lui' },
    },
    guessGap: {
      below: (percent) => `${percent} en dessous du prix affiché`,
      above: (percent) => `${percent} au-dessus du prix affiché`,
      equal: 'le prix affiché',
      answer: (amount) => `Votre réponse\u00a0: ${amount}`,
    },
    alignment: PRICE_ALIGNMENT_LABELS,
    pricePosition: {
      sentence: (price, where) => `À ${price}, votre bien serait ${where}.`,
      mostExpensive: (total) => `le plus cher des ${total} biens comparés`,
      cheapest: (total) => `le moins cher des ${total} biens comparés`,
      amongMostExpensive: (total) => `parmi les plus chers des ${total} biens comparés`,
      amongCheapest: (total) => `parmi les moins chers des ${total} biens comparés`,
      middle: (total) => `dans la moyenne des ${total} biens comparés`,
      rank: (rank, total) => `le ${rank === 1 ? '1er' : `${rank}e`} moins cher sur ${total}`,
    },
  },
  neighbourhood: {
    title: 'Vivre ici',
    subtitle: 'Le quartier, les écoles, les commerces',
    heading: 'Vivre ici — le quartier, les écoles, les commerces',
    open: 'Ouvrir la page du quartier',
    scan: (address) => `Scannez pour découvrir le quartier, ou tapez ${address}`,
    scanOnly: 'Scannez pour découvrir le quartier.',
    validUntil: (day) => `Lien valable jusqu’au ${day}.`,
  },
  quartier: {
    kicker: 'Votre quartier',
    salesKicker: 'Vos voisins ont vendu',
    home: 'Votre bien',
    source: (name, day) => `Source : ${name}${day ? `, données du ${day}` : ''}`,
    frozen: (day) => `Informations publiques telles qu’au ${day}.`,
    sources: {
      urbanisme: 'Géoportail de l’urbanisme (IGN)',
      risques: 'Géorisques (ministère de la Transition écologique)',
      population: 'Insee, revenus fiscaux localisés (Filosofi), carreaux de 200 m',
      copropriete: 'Registre national des copropriétés (Anah)',
      permis: 'Sitadel (SDES), permis de construire',
      ventes: 'DVF (DGFiP), ventes de logements anciens',
    } satisfies Record<NeighbourhoodBlockKey, string>,
    within: (meters) => `Autour du bien, à moins de ${meters}`,
    range: (from, to) => `${from} à ${to}`,
    nothing: 'rien de relevé',
    diagram: 'Schéma des distances, pas une carte : les directions ne sont pas connues.',
    scale: { commune: 'la commune', address: 'l’adresse du bien' },
    planning: {
      title: 'L’urbanisme',
      parcel: 'Votre parcelle',
      headline: (parcel, within40, meters40) =>
        parcel > 0
          ? `${parcel} ${parcel > 1 ? 'éléments d’urbanisme relevés' : 'élément d’urbanisme relevé'} sur votre parcelle.`
          : within40 > 0
            ? `Rien de relevé sur votre parcelle ; ${within40} ${within40 > 1 ? 'éléments' : 'élément'} à moins de ${meters40}.`
            : `Rien de relevé sur votre parcelle, ni à moins de ${meters40}.`,
      item: (category, count) => {
        const many = count > 1;
        const words: Record<PlanningCategory, [string, string]> = {
          voirie: ['emplacement réservé pour une voie', 'emplacements réservés pour une voie'],
          alignement: ['alignement de voie', 'alignements de voie'],
          equipement: [
            'emplacement réservé pour un équipement public',
            'emplacements réservés pour des équipements publics',
          ],
          logements: [
            'emplacement réservé pour des logements',
            'emplacements réservés pour des logements',
          ],
          attente: ['périmètre d’attente de projet', 'périmètres d’attente de projet'],
          oap: ['orientation d’aménagement', 'orientations d’aménagement'],
          perimetre: [
            'périmètre particulier du plan local d’urbanisme',
            'périmètres particuliers du plan local d’urbanisme',
          ],
        };
        return `${count} ${words[category][many ? 1 : 0]}`;
      },
      count: (count) => (count > 1 ? 'éléments relevés' : 'élément relevé'),
      nearest: (meters) => `le plus proche à ${meters}`,
    },
    permits: {
      title: 'Les permis de construire',
      headline: (count, meters, since) =>
        count > 0
          ? `${count} permis de construire à moins de ${meters}${since ? `, depuis ${since}` : ''}.`
          : `Aucun permis de construire relevé à moins de ${meters}${since ? ` depuis ${since}` : ''}.`,
      count: () => 'permis',
      none: 'aucun',
      more: (count, meters) =>
        `et ${count} ${count > 1 ? 'autres permis' : 'autre permis'} à moins de ${meters}`,
      at: (meters) =>
        `à ${meters.length > 1 ? `${meters.slice(0, -1).join(', à ')} et à ${meters[meters.length - 1]}` : meters[0]}`,
      line: ({ dwellings, surface, state, month, distance }) => {
        const parts = [
          dwellings != null ? `${dwellings} ${dwellings > 1 ? 'logements' : 'logement'}` : null,
          surface,
          state === 'autorise'
            ? month
              ? `autorisé en ${month}`
              : 'autorisé'
            : state === 'commence'
              ? 'travaux commencés'
              : state === 'termine'
                ? 'terminé'
                : null,
        ].filter(Boolean);
        return `${parts.join(', ')}${distance ? `${parts.length ? ' · ' : ''}à ${distance}` : ''}`;
      },
    },
    risks: {
      title: 'Les risques',
      headline: (earthquake, clay) => {
        const same =
          (earthquake === 2 && clay === 1) ||
          (earthquake === 4 && clay === 2) ||
          (earthquake === 5 && clay === 3);
        if (same && clay != null)
          return `Séisme et argiles : un niveau ${['faible', 'moyen', 'fort'][clay - 1]}.`;
        const parts = [
          earthquake != null
            ? `Séisme : zone ${earthquake} sur 5, « ${['très faible', 'faible', 'modérée', 'moyenne', 'forte'][earthquake - 1]} »`
            : null,
          clay != null ? `argiles : exposition ${['faible', 'moyenne', 'forte'][clay - 1]}` : null,
        ].filter(Boolean);
        return parts.length
          ? `${parts.join(' ; ')}.`
          : 'Les risques de la commune et de votre adresse.';
      },
      earthquake: 'Séisme',
      clay: 'Argiles',
      radon: 'Radon',
      earthquakeLevels: ['très faible', 'faible', 'modérée', 'moyenne', 'forte'],
      clayLevels: ['faible', 'moyen', 'fort'],
      radonLevels: ['faible', 'faible, transfert facilité', 'significatif'],
      earthquakeCaption: (level) =>
        `zone ${level} sur 5 : « ${['très faible', 'faible', 'modérée', 'moyenne', 'forte'][level - 1]} »`,
      clayCaption: (level) =>
        `exposition ${['faible', 'moyenne', 'forte'][level - 1]}, sur 3 niveaux`,
      radonCaption: (level) =>
        `catégorie ${level} sur 3 : potentiel « ${['faible', 'faible, transfert facilité', 'significatif'][level - 1]} »`,
      disasters: 'Catastrophes naturelles',
      disastersCaption: (count, latest) =>
        count === 0
          ? 'aucune reconnue'
          : `${count > 1 ? 'reconnues' : 'reconnue'}${latest ? `, ${count > 1 ? 'la dernière ' : ''}le ${latest}` : ''}`,
      flood: 'Commune classée',
      floodCaption: (name) => `territoire à risque important d’inondation : ${name}`,
    },
    population: {
      title: 'La population',
      headline: (inhabitants) => `${inhabitants} habitants autour de votre bien.`,
      within: (meters) => `À moins de ${meters}, valeurs arrondies`,
      inhabitants: 'habitants',
      households: 'ménages',
      perHousehold: 'personnes par ménage',
      pictogram: (count, what) => `(un pictogramme : ${count} ${what})`,
    },
    condominium: {
      title: 'La copropriété',
      headline: (lots, from, to) =>
        `Une copropriété${lots != null ? ` de ${lots} ${lots > 1 ? 'lots' : 'lot'} d’habitation` : ''}${
          from != null && to != null
            ? `, construite entre ${from} et ${to}`
            : to != null
              ? `, construite avant ${to}`
              : from != null
                ? `, construite après ${from}`
                : ''
        }.`,
      atAddress: 'À l’adresse du bien',
      near: (meters) => `À environ ${meters} du bien`,
      built: 'construite',
      today: 'aujourd’hui',
      lots: 'lots d’habitation',
      syndic: 'Mandat de syndic',
      syndicEnded: (day) => `terminé le ${day}`,
      syndicActive: 'en cours',
    },
    sales: {
      title: 'Les ventes réelles',
      headline: (count, type, surface, since) => {
        const many = count > 1;
        const noun =
          type === 'maison'
            ? many
              ? 'maisons'
              : 'maison'
            : type === 'appartement'
              ? many
                ? 'appartements'
                : 'appartement'
              : many
                ? 'logements'
                : 'logement';
        const sold = type === 'maison' ? (many ? 'vendues' : 'vendue') : many ? 'vendus' : 'vendu';
        const size = surface ? ` de ${surface.from} à ${surface.to}` : '';
        return `${count} ${noun}${size} ${sold} autour de chez vous${since ? ` depuis ${since}` : ''}`;
      },
      within: (meters) => `À moins de ${meters} de votre bien`,
      about: (meters) => `à environ ${meters}`,
      legend:
        'Chaque point : une vente, à sa date, plus haut quand le prix est plus élevé. Prix de vente réels.',
      legendMany:
        'Chaque point : une vente, à sa date, plus haut quand le prix est plus élevé. Prix écrits, quand la place le permet : le plus bas, le plus haut et le plus récent. Prix de vente réels.',
      columns: {
        month: 'Vendue en',
        street: 'Rue',
        rooms: 'Pièces',
        surface: 'Surface',
        distance: 'À environ',
        price: 'Prix',
      },
      none: 'Aucune vente relevée autour de chez vous.',
      shortPrice: (thousands) => `${thousands} k€`,
    },
  },
  live: {
    perceived: {
      question: 'À quel prix positionneriez-vous aujourd’hui votre bien ?',
      savedHint: 'Votre prix de départ est noté : il ne se modifie plus.',
      hint: 'D’abord votre intuition, avant de regarder le marché : c’est elle que nous notons ici.',
      label: 'Votre valeur perçue',
      confirmHint: 'Est-ce bien votre prix\u00a0? Une fois confirmé, il ne se modifie plus.',
      seePrices: 'Voir les biens et leurs prix',
      seePricesAsk: 'Nous regardons les biens et leurs prix maintenant\u00a0?',
      seePricesYes: 'Oui, voir les prix',
      seePricesBack: 'Revenir à la question',
    },
    competition: {
      question: 'Est-il un sérieux concurrent pour votre bien ?',
      hint: 'Observez le bien comme le ferait un acheteur — son prix viendra ensuite.',
      serious: SERIOUS_COMPETITOR_LABELS,
      seriousShort: { yes: 'Oui, sérieux', no: 'Non', unsure: 'Incertain' },
    },
    priceReveal: {
      question: 'Ce prix vous paraît-il cohérent ?',
      guessFirst:
        'Donnez d’abord le prix que vous imaginez, à l’écran précédent : le prix réel s’affichera ensuite.',
      hint: 'Voici le prix réellement affiché. Qu’en pensez-vous, face au prix que vous imaginiez ?',
      listed: 'Prix affiché sur le marché',
      perSqm: 'Prix au m²',
      position: 'Position (prix/m²)',
      legend: 'Selon vous, ce prix est…',
    },
    duration: {
      question: 'Pourquoi est-il toujours sur le marché ?',
      revealedHint: 'La durée observée est révélée — qu’est-ce qui retient ce bien sur le marché ?',
      hint: 'D’abord votre intuition : depuis combien de temps ce bien est-il en vente ?',
      listed: 'Prix affiché',
      perSqm: 'Prix au m²',
      serious: 'Sérieux concurrent ?',
      notGiven: 'Non renseigné',
      days: (count) => `${formatNumber(count)}\u00a0jour${count > 1 ? 's' : ''}`,
      observedDays: (count) => `${formatNumber(count)} jours`,
      label: 'La durée que vous imaginez',
      unit: 'jours',
      why: 'Selon vous, pourquoi ?',
      answerFirst:
        'Donnez d’abord votre réponse : la durée réellement observée s’affichera ensuite.',
      observed: 'Durée observée sur le marché',
      unavailable: 'Non disponible',
      observedSince: (days) => `Observé sur le marché depuis ${days} jours`,
      more: (gap, guess) => `Soit ${gap} jours de plus que votre réponse (${guess} jours).`,
      less: (gap, guess) => `Soit ${gap} jours de moins que votre réponse (${guess} jours).`,
      initialPrice: 'Prix initial',
      drop: 'Baisse constatée',
      noHistory: 'Historique de prix non disponible.',
    },
    quick: {
      guessQuestion: 'Un sérieux concurrent ? Et à quel prix, selon vous ?',
      guessHint:
        'Regardez ce bien comme le ferait un acheteur, puis donnez le prix que vous imaginez.',
      seriousLegend: 'Est-il un sérieux concurrent pour votre bien ?',
      nextScreen: 'Le prix réel s’affichera à l’écran suivant.',
      revealQuestion: 'Voici son prix.',
      priceOnly: 'Le prix réellement affiché, face au prix que vous imaginiez.',
      durationShown: 'Et voici depuis combien de temps il est en vente.',
      durationAsk: 'Et selon vous, depuis combien de temps est-il en vente ?',
      durationNote: 'La durée réellement observée s’affichera à la place de ce champ.',
    },
    direct: {
      question: 'Un bien en vente près du vôtre',
      hint: 'Ce qui le rapproche du vôtre, ce qui l’en distingue, et son prix.',
    },
    price: {
      question: 'À quel prix pensez-vous que ce bien est proposé ?',
      savedHint: 'Votre réponse est notée : elle ne se modifie plus.',
      hint: 'Donnez le prix que vous imaginez : le prix réel s’affichera à l’écran suivant.',
      label: 'Le prix que vous imaginez',
      note: 'Le prix réel n’apparaît pas ici. Passez à l’écran suivant pour le découvrir.',
    },
    titles: {
      intro: 'Introduction',
      subject_property: 'Votre bien',
      seller_perceived_price: 'Votre valeur perçue',
      comparable_competition: 'Un sérieux concurrent ?',
      comparable_price: 'À quel prix ?',
      comparable_price_reveal: 'Ce prix vous paraît-il cohérent ?',
      comparable_duration: 'Pourquoi toujours en vente ?',
      comparable_quick_guess: 'Un sérieux concurrent, et à quel prix ?',
      comparable_quick_reveal: 'Son prix, et depuis quand ?',
      comparable_direct: 'Son prix et son temps de vente',
      dpe_market: 'Le DPE face au marché',
      advisor_closest: 'Le concurrent le plus proche',
      dangerous_competitor: 'Le concurrent le plus dangereux',
      seller_revised_price: 'Votre prix après le marché',
      price_analysis: 'Analyse des prix',
      conclusion: 'Conclusion',
      closing_question: 'Prêt à lancer ?',
      neighbourhood_block: 'Votre quartier',
      neighbourhood_sales: 'Vos voisins ont vendu',
    },
    shell: {
      kicker: 'Rendez-vous vendeur',
      competitorOf: (index, total) => `Concurrent ${index} sur ${total}`,
      stepOf: (step, total) => `Étape ${step} sur ${total}`,
      previous: '← Précédent',
      skip: 'Passer',
      validate: 'Valider et continuer →',
      confirm: 'Confirmer et continuer →',
      revealDuration: 'Révéler la durée →',
      finish: 'Terminer le rendez-vous →',
      retry: 'Réessayer',
      saving: 'Enregistrement…',
      savingPrice: 'Enregistrement du prix…',
      answerSaved: 'Réponse enregistrée',
      noteSaved: 'Note enregistrée',
      failedSave: 'Une réponse n’a pas pu être enregistrée — touchez Réessayer',
      connectionLost: CONNECTION_LOST_MESSAGE,
      // Mission 144 — les trois seuls messages d'échec du Live disent quoi faire.
      // Mission 144 — le message nomme le bouton présent à l'écran.
      // « touchez Réessayer » se suffit : pas de « pour réessayer » après lui.
      connectionLostTouch: (button, isRetry) =>
        `Connexion perdue — touchez ${button}${isRetry ? '' : ' pour réessayer'}`,
      saveFailedTouch: (button, isRetry) =>
        `Enregistrement impossible — touchez ${button}${isRetry ? '' : ' pour réessayer'}`,
      sessionExpired: 'Session expirée — reconnectez-vous pour reprendre le Live',
      saveFailed: 'Enregistrement impossible — touchez Valider pour réessayer',
      analysisFailed: 'Analyse indisponible. Réessayez.',
      noteFailed: 'L’enregistrement de la note a échoué. Réessayez.',
      durationMissing: 'Indiquez la durée que vous imaginez.',
      priceGuessMissing: 'Indiquez le prix que vous imaginez.',
      perceivedMissing: 'Indiquez le prix que vous avez en tête.',
      revisedMissing: 'Indiquez votre prix, ou touchez « Passer ».',
      unavailable: 'Cet écran n’est pas disponible pour le moment.',
      quitTitle: 'Quitter le rendez-vous\u00a0?',
      quitUnsaved:
        'Certaines réponses ne sont pas encore enregistrées. Restez un instant, ou relancez l’enregistrement avant de quitter.',
      quitSaved: 'Vos réponses sont enregistrées.',
      stay: 'Rester',
      quit: 'Quitter',
      quitAnyway: 'Quitter quand même',
      light: 'Clair',
      dark: 'Sombre',
      toLight: 'Passer en thème clair',
      toDark: 'Passer en thème sombre',
      fullscreen: 'Plein écran',
      exitFullscreen: 'Quitter le plein écran',
    },
    intro: {
      title: 'Découvrons ensemble les biens en concurrence avec votre logement.',
      start: 'Démarrer la présentation',
      count: (count) =>
        `${count} bien${count > 1 ? 's' : ''} concurrent${count > 1 ? 's' : ''} à examiner`,
    },
    property: {
      title: 'Votre bien',
      askHint: 'Reconnaissez-vous votre bien dans cette présentation ?',
      showHint: 'Votre bien, tel que nous allons le comparer aux biens en vente.',
      fallbackAlt: 'Votre bien',
      stats: {
        type: 'Type',
        surface: 'Surface',
        rooms: 'Pièces',
        bedrooms: 'Chambres',
        floor: 'Étage',
        exposure: 'Exposition',
        condition: 'État',
        construction: 'Construction',
        heating: 'Chauffage',
        energy: 'DPE',
        ges: 'GES',
        outdoor: 'Extérieurs',
        parking: 'Stationnement',
        district: 'Quartier',
        city: 'Ville',
        address: 'Adresse',
      },
      highlights: 'Points forts',
      question: 'Est-ce que cette présentation correspond bien à votre bien ?',
      confirmed: PROPERTY_CONFIRMED_LABELS,
    },
    dpe: {
      title: 'Le DPE face au marché',
      hint: 'Les acheteurs comparent la classe énergie de chaque bien avant de visiter.',
      yours: 'Votre bien',
      noDpe: 'Pas encore de DPE : il sera établi par le diagnostiqueur.',
      competitors: 'Vos concurrents',
      competitorCount: (count) => `${count} concurrent${count > 1 ? 's' : ''}`,
      unknown: (reference) =>
        `Vos concurrents affichent surtout ${reference}. Après le passage du diagnostiqueur, votre bien devra être ${reference === 'A' ? 'en A' : `en ${reference} ou mieux`} pour rester dans la course ; au-delà, il faudra peut-être ajuster la stratégie de prix.`,
      better: 'Votre DPE est un atout face à vos concurrents.',
      equal: 'Votre DPE est dans la moyenne de vos concurrents.',
      worse:
        'Votre DPE est moins bon que celui de la plupart de vos concurrents : les acheteurs compareront. À intégrer dans la stratégie de prix.',
    },
    revised: {
      question: 'Après avoir vu ces biens, à quel prix mettriez-vous votre bien en vente ?',
      savedHint: 'Votre prix est noté : il ne se modifie plus.',
      hint: 'Votre prix, maintenant que vous avez vu le marché. Vous pouvez aussi passer.',
      label: 'Votre prix après avoir vu le marché',
      confirmHint: 'Est-ce bien votre prix\u00a0? Une fois confirmé, il ne se modifie plus.',
    },
    closest: {
      title: 'Le concurrent le plus proche de votre bien',
      hint: 'Celui que votre bien rencontrera le plus souvent chez les acquéreurs.',
      badge: 'Le plus proche de votre bien',
    },
    dangerous: {
      question: 'Quel concurrent vous paraît le plus dangereux ?',
      hint: 'Les biens que vous avez jugés sérieux (ou incertains), avec leur prix révélé.',
      none: 'Aucun bien n’a été retenu comme concurrent sérieux ou incertain.',
      review: 'Revoir',
      others: 'Les autres biens regardés',
      serious: (answer) => `Sérieux concurrent : ${answer}`,
      notGiven: 'Non renseigné',
      why: 'Pourquoi celui-là ?',
    },
    analysis: {
      title: 'Analyse des prix',
      pendingHint: 'Il reste à passer :',
      readyHint: 'Tout est passé, l’analyse est prête.',
      goTo: 'Y aller',
      showAnalysis: 'Afficher l’analyse',
      pendingPerceived: 'Votre valeur perçue',
      pendingCompetitor: (index, label) => `Concurrent ${index} (${label})`,
      hintWithPrice: 'Voici le marché, face au prix que vous aviez en tête.',
      hintDirect: 'Voici le marché des biens que nous avons regardés ensemble.',
      pathStart: (price) => `Au début\u00a0: ${price}`,
      pathAfter: (price) => ` → Après avoir vu le marché\u00a0: ${price}`,
      perceived: 'Votre valeur perçue',
      competitorPrice: 'Prix des concurrents',
      advisor: 'Analyse du conseiller',
      listed: 'Prix affichés',
      range: (low, high) => `${low} à ${high}`,
      median: 'Prix médian',
      dropped: 'Baisse de prix connue',
      droppedValue: (count, total) => `${count} sur ${total}`,
      medianDays: 'En vente depuis (médiane)',
      medianDaysValue: (days, count) => `${days}\u00a0jour${count > 1 ? 's' : ''}`,
      gaps: 'Écarts observés',
      gapSellerMarket: 'Votre valeur perçue vs prix des concurrents',
      gapSellerAdvisor: 'Votre valeur perçue vs analyse du conseiller',
      gapMarketAdvisor: 'Prix des concurrents vs analyse du conseiller',
      band: {
        title: 'Les prix affichés des biens que vous avez vus',
        start: 'Au début',
        revised: 'Après le marché',
        dangerous: 'Le plus dangereux selon vous',
        competitors: 'Prix des concurrents',
        dot: 'Un bien concurrent',
        marker: (label, price) => `${label} : ${price}`,
      },
    },
    conclusion: {
      title: 'Conclusion',
      hint: 'Ce que le rendez-vous a construit, noir sur blanc — la décision vous appartient.',
      perceived: 'Votre valeur perçue',
      competitorPrice: 'Prix des concurrents',
      advisor: 'Analyse du conseiller',
      closestLine: 'Concurrent le plus proche de votre bien',
      dangerousLine: 'Concurrent le plus dangereux',
      notSelected: 'Non sélectionné',
      justification: 'Justification du conseiller',
      closestCard: 'Le concurrent le plus proche de votre bien',
      dangerousCard: 'Le concurrent qui vous fait le plus réfléchir',
      sentence:
        'Le prix des concurrents montre à quels biens votre logement sera comparé. L’analyse du conseiller détermine le positionnement professionnel proposé.',
      priceQuestion: 'Sur quel prix partons-nous\u00a0?',
      priceHint: 'Le prix que nous retenons ensemble. Rien n’est pré-rempli.',
      saving: 'Enregistrement…',
      save: 'Enregistrer le prix',
      saved: 'Prix de commercialisation enregistré.',
    },
    closing: {
      question: (hasAgreedPrice) =>
        hasAgreedPrice
          ? 'Sur une échelle de 1 à 10, où en êtes-vous pour lancer la vente à ce prix\u00a0?'
          : 'Sur une échelle de 1 à 10, où en êtes-vous pour lancer la vente\u00a0?',
      scale: '1\u00a0: pas encore prêt · 10\u00a0: on y va.',
      scoreGroup: 'Votre note, de 1 à 10',
      launch: 'Alors, on lance la vente\u00a0?',
      missing: 'Qu’est-ce qui vous manquerait pour être à 10\u00a0?',
      answerOptional: 'Votre réponse (facultative)',
      agreedPrice: 'Prix de commercialisation',
    },
    competitorReview: {
      competitor: (position) => `Concurrent ${position}`,
      close: 'Fermer',
      listed: 'Prix affiché',
      perSqm: 'Prix au m²',
      since: 'En vente depuis',
      days: (days) => `${days} jours`,
    },
    listing: {
      open: 'Voir l’annonce',
      opening: 'Ouverture…',
      failed: (button) => `L’annonce ne s’est pas ouverte — touchez ${button} pour réessayer`,
      title: 'L’annonce telle qu’elle a été enregistrée',
      close: 'Fermer',
      listed: 'Prix affiché',
      recorded: (portal, day, atImport, price) =>
        `Relevé${portal ? ` sur ${portal}` : ''} le ${day}${atImport ? ' à l’import' : ''}${price ? `\u00a0: ${price}` : ''}`,
      recordedAsIs: 'Telle qu’enregistrée',
      lastCheck: (day, price, unchanged) =>
        `Revérifié le ${day}\u00a0: ${price}${unchanged ? ', inchangé' : ''}`,
      drop: (from, to, day) => `Une baisse connue\u00a0: ${from} → ${to} le ${day}`,
      gone: (day) =>
        day
          ? `L’annonce n’est plus en ligne depuis le ${day}\u00a0: il reste la copie enregistrée ci-dessus.`
          : 'L’annonce n’est plus en ligne\u00a0: il reste la copie enregistrée ci-dessus.',
      bedrooms: (count) => `${count} chambre${count > 1 ? 's' : ''}`,
      land: (area) => `Terrain ${area}`,
      dpe: (rating) => `DPE ${rating}`,
    },
    buyers: {
      phrase: 'familles cherchent un bien comme le vôtre et sont prêtes à visiter',
      promise: 'Avec votre accord, je les contacte dès cette semaine.',
      financing: 'Financement validé',
      back: 'Revenir au rendez-vous',
      since: (weeks) =>
        weeks < 1
          ? 'cherche depuis moins d’une semaine'
          : `cherche depuis ${weeks} semaine${weeks > 1 ? 's' : ''}`,
      budget: (low, high) => {
        if (high < 1_000_000)
          return `${formatNumber(low / 1_000)} – ${formatNumber(high / 1_000)} k€`;
        if (low >= 1_000_000) {
          return `${formatNumber(low / 1_000_000)} – ${formatNumber(high / 1_000_000)} M€`;
        }
        return `${budgetStepLabel(low)} – ${budgetStepLabel(high)}`;
      },
    },
    neutral: {
      pause: 'Rendez-vous en pause',
      thanks: 'Merci pour cet échange',
      thanksTab: 'Merci',
      resume: 'Reprendre →',
    },
    answers: {
      coherence: PRICE_COHERENCE_LABELS,
      coherenceShort: {
        coherent: 'Oui, cohérent',
        too_high: 'Trop élevé',
        too_low: 'Trop bas',
        unsure: 'Je ne sais pas',
      },
      dangerousReasonShort: {
        better_value: 'Rapport qualité/prix',
        better_condition: 'Meilleur état',
        better_location: 'Localisation',
        better_surface: 'Plus grande surface',
        better_outdoor: 'Meilleur extérieur',
        better_features: 'Prestations',
        more_attractive_price: 'Prix plus attractif',
        other: 'Autre',
      },
      durationReason: MARKET_DURATION_REASON_LABELS,
      dangerousReason: DANGEROUS_REASON_LABELS,
    },
  },
  documents: {
    common: {
      confidential: 'Étude confidentielle',
      advisor: 'Votre conseiller',
      contactCard: 'Carte de contact du conseiller',
      disclaimer:
        'Les prix cités sont ceux des annonces, pas des prix de vente. Surfaces et caractéristiques telles qu’annoncées, à vérifier.',
      yours: (value) => ` (vous : ${value})`,
      days: (days) => `${days} jours`,
      since: 'En vente depuis',
      onMarketFor: (days) => `en vente depuis ${days} jours`,
      livingArea: 'Surface habitable',
      land: 'Terrain',
      roomsBedrooms: 'Pièces · chambres',
      bedrooms: (count) => `${count} chambre${count > 1 ? 's' : ''}`,
      bedroomsShort: (count) => `${count} ch.`,
      outdoor: 'Extérieurs',
      parking: 'Stationnement',
      energy: 'DPE · GES',
      energyLetter: (kind, letter) => `${kind === 'dpe' ? 'DPE' : 'GES'} ${letter}`,
      floor: 'Étage',
      floorOrdinal: (floor) =>
        floor === 0 ? 'Rez-de-chaussée' : floor === 1 ? '1er étage' : `${floor}e étage`,
      floorOf: (total) => ` sur ${total}`,
      guesses: {
        under: (count, total, percent) =>
          `Vous avez sous-estimé ${count} concurrent${count > 1 ? 's' : ''} sur ${total}, de ${percent} en moyenne`,
        over: (count, total, percent) =>
          `Vous avez surestimé ${count} concurrent${count > 1 ? 's' : ''} sur ${total}, de ${percent} en moyenne`,
        exact: (count) =>
          `Vous avez donné le prix affiché de ${count} concurrent${count > 1 ? 's' : ''}`,
      },
    },
    synthesis: {
      seriousShort: {
        yes: 'Oui',
        unsure: SERIOUS_COMPETITOR_LABELS.unsure,
        no: SERIOUS_COMPETITOR_LABELS.no,
      },
      seriousQuestion: 'Un sérieux concurrent ?',
      notConsidered: 'Pas un concurrent pour vous : son prix n’a pas été regardé.',
      basisCalculated: (count, seen) =>
        `Calculé par votre conseiller sur ${
          count > 1 ? `les ${count} concurrents qu’il a retenus` : 'le concurrent qu’il a retenu'
        }${seenTogetherFr(count, seen)}`,
      basisAdvisor: (count, seen) =>
        `Prix choisi par votre conseiller, à partir ${
          count > 1 ? `des ${count} concurrents qu’il a retenus` : 'du concurrent qu’il a retenu'
        }${seenTogetherFr(count, seen)}`,
      positionAmongSeen: {
        mostExpensive: 'Le plus cher',
        cheapest: 'Le moins cher',
        amongMostExpensive: 'Parmi les plus chers',
        amongCheapest: 'Parmi les moins chers',
        middle: 'Dans la moyenne',
        rank: (rank) => `Le ${rank === 1 ? '1er' : `${rank}e`} moins cher`,
        sentence: (where, seen) =>
          `${where}\u00a0: votre bien face ${
            seen > 1 ? `aux ${seen} concurrents` : 'au concurrent'
          } dont vous avez vu le prix`,
      },
      notConsideredRow: (label) => `${label} · pas un concurrent pour vous`,
      thePrice: 'Le prix',
      youImagined: 'Vous imaginiez',
      listedShort: 'Affiché',
      durationTitle: 'La durée en vente',
      knownDrop: (amount) => `Baisse de prix connue : ${amount}`,
      listed: 'Prix affiché',
      whyYou: 'Pourquoi, selon vous',
      agreedPrice: 'Prix de commercialisation convenu',
      agreedTogether: 'Convenu ensemble',
      afterSeeing: 'Après avoir vu les biens',
      agreedTogetherHint: 'Prix de commercialisation convenu ensemble',
      badge: 'Dossier de rendez-vous',
      coverTitle: 'Notre rendez-vous',
      titleDay: (day) => `du ${day}`,
      forSeller: (name) => `Pour ${name}`,
      propertyTitle: 'Votre bien',
      propertyHint: 'Ce que nous avons regardé ensemble en début de rendez-vous.',
      strengths: 'Ses atouts',
      perceivedAtStart: 'Votre valeur perçue, en début de rendez-vous',
      competitorsTitle: 'Les biens que nous avons regardés ensemble',
      competitorsHint:
        'Dans l’ordre du rendez-vous : ce que nous avons vu, et ce que vous avez répondu.',
      dpeHint: 'La classe énergie des biens regardés, et celle du vôtre.',
      dpeProperties: (count) => `${count} bien${count > 1 ? 's' : ''}`,
      dpeReference: (letter) => `Repère du marché : ${letter}.`,
      dangerousTitle: 'Le concurrent le plus dangereux, selon vous',
      analysisTitle: 'L’analyse des prix',
      analysisHint: 'Les prix affichés des biens dont nous avons regardé le prix ensemble.',
      bandTitle: 'Prix affichés, du moins cher au plus cher',
      keyPoint: 'Le point à retenir',
      medianAge: 'Ancienneté médiane',
      perSqmTitle: 'Prix affichés au m², du moins cher au plus cher',
      median: 'Médiane',
      pathTitle: 'Le chemin de votre prix',
      pathHint: 'Au début du rendez-vous, après avoir vu le marché, puis le prix retenu ensemble.',
      answersTitle: 'Vos réponses face aux prix affichés',
      agreedPerSqm: 'Prix convenu au m²',
      amongCompared: 'Votre prix face aux concurrents',
      stepsBand: 'Les étapes face aux prix affichés des biens regardés',
    },
    marketUpdate: {
      download: 'Télécharger en PDF',
      badge: 'Point marché',
      coverTitle: 'Point marché',
      titleDay: (day) => `du ${day}`,
      sinceMeeting: (day) => `Depuis notre rendez-vous du ${day}`,
      forSeller: (name) => `Pour ${name}`,
      agreedPrice: 'Prix retenu ensemble',
      followed: 'Concurrents suivis',
      newcomersCount: 'Nouveaux venus retenus',
      competitorsTitle: 'Les concurrents, depuis le rendez-vous',
      competitorsHint:
        'Pour chaque concurrent retenu : son prix au rendez-vous, son prix aujourd’hui, et ce qu’il est devenu.',
      newcomersTitle: 'Nouveaux sur le marché depuis le rendez-vous',
      newcomersHint: (since, from) =>
        `Les biens vus sur le marché${since ? ` depuis le ${since}` : ' depuis le rendez-vous'}, ${
          from ? `de ${from} à votre prix` : 'à votre prix ou moins'
        }, et retenus par votre conseiller pour la comparaison.`,
      earlierTitle: 'Retenus depuis le rendez-vous',
      earlierHint:
        'Des biens déjà en vente avant notre rendez-vous, que nous n’avions pas regardés ensemble : ils ne comptent pas parmi les nouveaux venus.',
      rankingTitle: 'Où en est votre prix',
      noRanking: 'Sans prix retenu ensemble, le classement ne se calcule pas.',
      readingTitle: 'Pour lire ce document',
      reading:
        'Les prix cités sont ceux des annonces, pas des prix de vente. Une annonce disparue n’est pas une vente constatée : « vente probable » et la négociation « estimée » sont déduites de la durée de commercialisation au retrait, selon la règle de l’agence ; « probablement retiré sans vente » dit une annonce retirée après plus de 300 jours. Rien ici n’affirme qu’un bien est vendu, ni à quel prix. Surfaces et caractéristiques telles qu’annoncées, à vérifier. « Vu sur le marché depuis le … » est la date de publication dite par l’annonce, sinon le jour où votre conseiller l’a retenue : jamais une date inventée.',
      dangerousToday: 'Le plus dangereux aujourd’hui',
      dangerousYours: 'Le plus dangereux, selon vous',
      beforeMeeting: 'En vente avant le rendez-vous, non montré alors',
      newcomer: 'Nouveau venu',
      meetingChoice: ' · votre choix au rendez-vous',
      notShown: ' · Non montré au rendez-vous',
      features: 'Ses caractéristiques face à votre bien',
      newcomerPriceTitle: 'Le prix, depuis son arrivée sur le marché',
      seenSince: 'Vu sur le marché depuis le',
      notYetListed: 'pas encore en vente au rendez-vous',
      newcomerNote:
        'Retenu par votre conseiller pour la comparaison : il compte dans «\u00a0Avec les nouveaux venus\u00a0», pas dans «\u00a0Au rendez-vous\u00a0» ni «\u00a0Aujourd’hui\u00a0».',
      priceTitle: 'Le prix, depuis le rendez-vous',
      atMeeting: 'Au rendez-vous',
      unread: 'Non relu',
      unreadHint: 'le prix d’alors n’a pas été relevé',
      meetingPriceHint: 'prix affiché au rendez-vous',
      todayPrice: 'Prix du jour',
      today: 'Aujourd’hui',
      removed: (day, after) =>
        `Retirée${day ? ` le ${day}` : ''}${after ? `, après ${after}` : ''}`,
      lastPrice: (price) => `dernier prix affiché : ${price}`,
      droppedSeen: (day) => `baisse vue le ${day}`,
      raisedSeen: (day) => `hausse vue le ${day}`,
      readOn: (day) => `relu le ${day}`,
      conclusion: 'Conclusion',
      gap: 'Écart',
      noConclusion: 'durée en vente inconnue : aucune conclusion',
      unchanged: 'prix inchangé',
      gapAmount: (amount, lower) => `soit ${amount} de ${lower ? 'moins' : 'plus'}`,
      noGap: 'sans prix du rendez-vous, pas d’écart',
      likelySale: (min, max) => `Prix de vente estimé : entre ${min} et ${max}`,
      likelySaleNote:
        'Déduit de la durée de commercialisation au retrait, selon la règle de l’agence : rien ne dit que ce bien est vendu, ni à quel prix.',
      withdrawnNote: 'Plus de 300 jours en vente au retrait : probablement retiré sans vente.',
      stillListed: 'Toujours en vente',
      sinceDays: (days) => `depuis ${days}`,
      perSqmToday: (value) => `${value} aujourd’hui`,
      days: (days, approximate) =>
        `${approximate ? 'environ ' : ''}${days} jour${days > 1 ? 's' : ''}`,
      withdrawnLabel: 'Probablement retiré sans vente',
      probableSaleLabel: (min, max) => `Vente probable, négociation estimée de ${min} à ${max} %`,
      ranking: {
        words: { green: 'Pas de problème', orange: 'Attention', red: 'Danger' },
        legend: { green: 'pas de problème', orange: 'attention', red: 'danger' },
        legendTiers: [
          { number: '1', sup: 'er', rest: ' tiers : ' },
          { number: '2', sup: 'e', rest: ' tiers : ' },
          { number: '', sup: '', rest: 'dernier tiers : ' },
        ],
        youAre: (word) => `${word} : vous êtes `,
        ordinal: (rank) => (rank === 1 ? 'er' : 'e'),
        of: (total) => `sur ${total}`,
        atMeeting: 'Au rendez-vous',
        today: 'Aujourd’hui',
        withNewcomers: 'Avec les nouveaux venus',
        meetingUnread: 'Prix du rendez-vous non relus',
        noNewcomer: 'Aucun nouveau venu retenu',
        searched: (min, max) => `Nouveaux venus cherchés entre ${min} et ${max}`,
        newBadge: 'Nouveau',
        dangerousToday: 'Le plus dangereux aujourd’hui',
        dangerous: 'Le plus dangereux',
        yourProperty: 'VOTRE BIEN',
        agreedTogether: 'prix retenu ensemble',
        atMeetingPrice: (price) => `Au rendez-vous : ${price}`,
        todayPrice: (price) => `Aujourd’hui : ${price}`,
        tableTitle: 'Classement, du moins cher au plus cher',
        tableMeeting: 'Prix au rendez-vous',
        tableToday: 'Prix aujourd’hui',
        meetingChoice: 'votre choix au rendez-vous',
        arrivedOn: (day) => `arrivé le ${day}`,
        arrivedAfter: 'arrivé après le rendez-vous',
        droppedBy: (percent) => `a baissé de ${percent}`,
        onMarketFor: (days, approximate) =>
          `en vente depuis ${approximate ? 'environ ' : ''}${days} ${days > 1 ? 'jours' : 'jour'}`,
        noDrop: 'Aucun concurrent n’a baissé depuis le rendez-vous',
        drops: (count) =>
          `${count} ${count > 1 ? 'concurrents ont' : 'concurrent a'} baissé depuis le rendez-vous`,
        gone: (count) => `, ${count} ${count > 1 ? 'ont' : 'a'} quitté le marché`,
        cheaperNewcomers: (count) =>
          `${count} ${count > 1 ? 'biens sont arrivés' : 'bien est arrivé'} sur le marché moins ${count > 1 ? 'chers' : 'cher'} que le vôtre`,
        but: ', mais',
        and: ', et',
        below: (amount) => `${amount} sous votre prix`,
        above: (amount) => `${amount} au-dessus de votre prix`,
        atYourPrice: 'à votre prix',
        newDangerous: (newcomer, label, price, where) =>
          ` ${newcomer ? 'Un nouveau venu' : 'Un autre bien'} devient le plus dangereux : ${label}, à ${price}, ${where}.`,
        shortRooms: (label) => label.replace(/(\d+) pièces?/, '$1 p.'),
      },
      share: {
        message: (url, since) =>
          [
            `Bonjour, voici le Point marché${since ? ` depuis notre rendez-vous du ${since}` : ''} : ${url}`,
            'Il montre ce qui a bougé chez les biens que nous avons regardés ensemble, et où en est votre prix.',
          ].join('\n'),
        subject: (day) => (day ? `Point marché du ${day}` : 'Point marché'),
      },
    },
    marketStudy: {
      print: 'Imprimer',
      badge: 'Étude de marché',
      coverTitle: 'Étude de marché',
      byAdvisor: (name) => `Par ${name}`,
      competitorsTitle: 'Les biens en vente face au vôtre',
      competitorsHint:
        'Chaque concurrent retenu par votre conseiller : ses caractéristiques face à votre bien, son prix affiché et depuis quand il est en vente.',
      noCompetitors: 'Aucun concurrent retenu pour l’instant : le classement ne se calcule pas.',
      priceToday: 'Son prix aujourd’hui',
      listing: 'Annonce',
      removedOn: (day) => `Retirée le ${day}`,
      notRanked: 'elle ne compte pas dans le classement',
      alreadyDropped: 'a déjà baissé son prix',
      surface: 'Surface',
      rooms: 'Pièces',
      studied: 'Concurrents étudiés',
      proposedPrice: 'prix proposé',
      cheapest: 'votre bien serait le moins cher des biens en vente que nous avons étudiés.',
      priciest: 'votre bien serait le plus cher des biens en vente que nous avons étudiés.',
      cheaperCount: (count) =>
        `${count} ${count > 1 ? 'biens en vente sont' : 'bien en vente est'} moins ${count > 1 ? 'chers' : 'cher'} que le vôtre.`,
      atPrice: (price, rest) => `À ${price}, ${rest}`,
      noReference:
        'Les biens en vente aujourd’hui, du moins cher au plus cher. Votre bien s’y placera quand votre conseiller vous aura proposé un prix.',
      share: {
        message: (url) =>
          [
            `Bonjour, voici l’Étude de marché de votre bien : ${url}`,
            'Elle montre les biens en vente autour du vôtre aujourd’hui, et où se situe votre prix.',
          ].join('\n'),
        subject: (day) => (day ? `Étude de marché du ${day}` : 'Étude de marché'),
      },
      story: FRENCH_STUDY,
    },
  },
  buyer: {
    screens: {
      answers: ITEM_ANSWER_LABELS,
      gridAnswers: GRID_ANSWER_LABELS,
      reasons: NO_REASON_LABELS,
      slots: AVAILABILITY_LABELS,
      mustHave: 'indispensable',
      legendMarks: GRID_LEGEND_MARKS,
      wordsTitle: 'Vous m’avez dit :',
      pitchTitle: 'Pourquoi je vous le propose',
      nextTitle: 'Ce que je fais ensuite',
      connectionLost: 'Connexion perdue — réessayez.',
      kickerSelection: (count) => `Votre sélection · ${count} bien${count > 1 ? 's' : ''}`,
      kickerCriteria: 'Vos critères',
      kickerItem: (letter, count) => `Bien ${letter} · ${count}`,
      kickerAnswer: 'Votre réponse',
      finishedOn: (day) => `Terminé le ${day}`,
      meetingLabel: 'Rendez-vous acquéreur',
      noAnswer: 'Aucune réponse pour l’instant.',
      visit: (count, letters) =>
        `Vous voulez visiter ${count > 1 ? 'les biens' : 'le bien'} ${letters}.`,
      when: 'Quand pouvez-vous visiter ?',
      hesitate: (count, letters) =>
        `Vous hésitez pour ${count > 1 ? 'les biens' : 'le bien'} ${letters}.`,
      notForYou: (letter) => `Le bien ${letter} : pas pour vous. Pourquoi ?`,
      nextStep: (count, letters) =>
        `Je contacte ${count > 1 ? 'les propriétaires' : 'le propriétaire'} de ${letters} et je vous confirme les visites sous 24 h.`,
      letters: (letters) =>
        letters.length <= 1
          ? (letters[0] ?? '')
          : `${letters.slice(0, -1).join(', ')} et ${letters.at(-1)}`,
      unanswered: (letters, verb) =>
        `${letters.length} bien${letters.length > 1 ? 's' : ''} sans réponse : ${
          letters.length <= 1
            ? (letters[0] ?? '')
            : `${letters.slice(0, -1).join(', ')} et ${letters.at(-1)}`
        }. ${verb === 'finish' ? 'Terminer' : 'Envoyer'} quand même ?`,
      cancel: 'Annuler',
      finishAnyway: 'Terminer quand même',
      sendAnyway: 'Envoyer quand même',
      close: 'Fermer',
      finish: 'Terminer la présentation',
      previous: 'Précédent',
      next: 'Suivant',
      backToGrid: 'Revenir à la grille',
      gridShort: 'Grille',
      toAvailability: 'Passer à ses disponibilités',
      availabilityShort: 'Ses disponibilités',
      quitTitle: 'Quitter la présentation ?',
      quitSaved: 'Ses réponses sont enregistrées.',
      seeItem: (letter) => `Voir le bien ${letter}`,
      why: 'Pourquoi ?',
      yourSlots: (slots) => `Vos créneaux : ${slots}`,
      reasonsSuffix: (reasons) => ` : ${reasons}`,
      propertiesForYou: (count) => `${count} bien${count > 1 ? 's' : ''} pour vous`,
      advisorLabel: 'Votre conseiller : ',
      propertiesCount: (count) => `${count} bien${count > 1 ? 's' : ''}`,
      answeredTitle: 'Ce que vous m’avez répondu :',
      seenTogether: (count, letters) =>
        `${count > 1 ? 'Les biens' : 'Le bien'} ${letters}, que nous avons regardés ensemble.`,
      hereIsWhat: 'Voici ce que vous m’avez répondu :',
      selectionOf: (day) => `Votre sélection du ${day}`,
      forYou: 'pour vous',
      seeSelection: 'Voir ma sélection →',
      notYetAnswered: 'Vous n’avez pas encore répondu : ouvrez un bien depuis la grille.',
      sending: 'Envoi…',
      send: DOSSIER_SEND,
      noAnswerYet: DOSSIER_NO_ANSWER,
      thanks: DOSSIER_THANKS,
      seenTogetherTitle: DOSSIER_SEEN_TOGETHER,
      livingHereLink: 'Vivre ici',
      livingHereLinkHint: 'Le quartier, les écoles, les commerces',
      download: DOSSIER_DOWNLOAD,
      presented: DOSSIER_PRESENTED,
      alreadyAnswered: DOSSIER_ALREADY_ANSWERED,
      expired: 'Ce lien n’est plus valable.',
      sendFailed: 'Votre réponse n’a pas pu être envoyée. Réessayez.',
      confidential: 'Sélection confidentielle',
      criterion: 'Critère',
      choicesTitle: DOSSIER_CHOICES_TITLE,
      disclaimer: DOSSIER_DISCLAIMER,
      tabTitle: 'Votre sélection',
      propertyFallback: 'Bien',
    },
    deck: {
      count: {
        rooms: (n) => `${n} ${n > 1 ? 'pièces' : 'pièce'}`,
        bedrooms: (n) => `${n} ${n > 1 ? 'chambres' : 'chambre'}`,
        days: (n) => `${n} ${n > 1 ? 'jours' : 'jour'}`,
      },
      ordinal: (n) => (n === 1 ? '1er' : `${n}e`),
      criteria: BUYER_CRITERION_LABELS,
      nouns: {
        property_types: 'le type de bien',
        cities: 'la commune',
        budget: 'le prix',
        rooms: 'le nombre de pièces',
        bedrooms: 'le nombre de chambres',
        surface: 'la surface',
        outdoor: 'l’extérieur',
        parking: 'le parking',
        pool: 'la piscine',
        floor: 'l’étage',
        elevator: 'l’ascenseur',
        energy_rating: 'le DPE',
        works: 'l’état du bien',
      },
      and: (items) =>
        items.length <= 1
          ? (items[0] ?? '')
          : `${items.slice(0, -1).join(', ')} et ${items.at(-1)}`,
      row: {
        house: 'Maison',
        apartment: 'Appartement',
        or: ' ou ',
        budget: (amount) => `Budget ≤ ${amount}`,
        andMore: (text) => `${text} et plus`,
        groundFloorAccepted: 'Rez-de-chaussée accepté',
        floor: (n) => `${n === 1 ? '1er' : `${n}e`} étage et plus`,
        energy: (letter) => `DPE ${letter} ou mieux`,
        noWorks: 'Sans travaux',
      },
      judge: {
        check: (label) => `${label} : à vérifier à la visite`,
        aHouse: 'Une maison',
        anApartment: 'Un appartement',
        houseNotFlat: 'Une maison, pas un appartement',
        flatNotHouse: 'Un appartement, pas une maison',
        inCity: (city) => `À ${city}`,
        outsideCities: (city) => `Hors de vos communes (${city})`,
        priceToConfirm: PRICE_TO_CONFIRM,
        priceToCheck: 'Prix : à vérifier ensemble',
        inBudgetMargin: (amount) => `Dans votre budget : ${amount} de marge`,
        inBudget: 'Dans votre budget',
        overNegotiable: (amount) => `${amount} au-dessus de votre budget, à négocier`,
        overBudget: (amount) => `Budget dépassé de ${amount}`,
        asAsked: (said) => `${said}, comme demandé`,
        insteadOf: (said, wanted) => `${said} au lieu de ${wanted}`,
        floorInsteadOf: (said, min) => `${said} au lieu du ${min === 1 ? '1er' : `${min}e`}`,
        noOutdoor: 'Pas d’extérieur',
        noParking: 'Pas de parking',
        aPool: 'Une piscine',
        noPool: 'Pas de piscine',
        groundFloor: 'Rez-de-chaussée',
        floor: (n) => `${n === 1 ? '1er' : `${n}e`} étage`,
        anElevator: 'Un ascenseur',
        noElevator: 'Sans ascenseur',
        dpe: (letter) => `DPE ${letter}`,
        dpeBeyond: (letter, max) => `DPE ${letter}, au-delà de ${max}`,
        worksNeeded: 'Travaux à prévoir',
        noWorksAnnounced: 'Pas de travaux annoncés',
      },
      words: {
        house: (rooms) =>
          `Une maison${rooms != null ? ` de ${rooms} ${rooms > 1 ? 'pièces' : 'pièce'}` : ''}`,
        rooms: (rooms) => `Un ${rooms} ${rooms > 1 ? 'pièces' : 'pièce'}`,
        apartment: 'Un appartement',
        property: 'Un bien',
        where: (cities) =>
          cities.length === 0
            ? ''
            : cities.length === 1
              ? ` à ${cities[0]}`
              : ` à ${cities.slice(0, -1).join(', ')} ou ${cities[cities.length - 1]}`,
        bedrooms: (n) => `avec ${n} ${n > 1 ? 'chambres' : 'chambre'} au moins`,
        surface: (area) => `de ${area} au moins`,
        outdoor: 'avec un extérieur',
        parking: 'avec un parking',
        pool: 'avec une piscine',
        floor: (n) => `au ${n === 1 ? '1er' : `${n}e`} étage au moins`,
        elevator: 'avec un ascenseur',
        energy: (letter) => `DPE ${letter} ou mieux`,
        noWorks: 'sans travaux',
        budget: (amount) => `jusqu’à ${amount}`,
      },
      pitch: {
        pool: 'piscine',
        garden: 'jardin',
        terrace: 'terrasse',
        garage: 'garage',
        at: (city) => `à ${city}`,
        margin: (amount) => `${amount} sous votre budget`,
        fallback: (ok, total, nouns, many) =>
          `Il coche ${ok} ${ok > 1 ? 'critères' : 'critère'} sur ${total} : ${nouns} ${many ? 'sont' : 'est'} à voir ensemble.`,
      },
      dated: {
        listedToday: 'Mis en vente aujourd’hui',
        listedFor: (days) => `En vente depuis ${days} ${days > 1 ? 'jours' : 'jour'}`,
        drop: (amount, days) =>
          `Baisse de prix de ${amount}${
            days == null
              ? ''
              : days === 0
                ? ' aujourd’hui'
                : ` il y a ${days} ${days > 1 ? 'jours' : 'jour'}`
          }`,
      },
      lead: {
        several: (letters) =>
          `Les biens ${letters.slice(0, -1).join(', ')} et ${letters.at(-1)} cochent tous vos critères.`,
        full: (letter) =>
          `Le bien ${letter} coche tous vos critères : c’est par lui que je vous propose de commencer.`,
        most: (letter, ok, total) => `Le bien ${letter} en coche le plus : ${ok} sur ${total}.`,
      },
      priceLine: (amount) => `Prix affiché : ${amount}`,
      seenOn: (day) => `affiché le ${day}`,
      criteriaCount: (ok, total) => `${ok} ${ok > 1 ? 'critères' : 'critère'} sur ${total}`,
    },
    messages: {
      hello: (name) => `Bonjour ${name},`,
      phrase: (kind, city) => {
        const noun =
          kind === 'house' ? 'la maison' : kind === 'apartment' ? 'l’appartement' : 'le bien';
        if (!city) return noun;
        return /^[aeiouyàâéèêîôûh]/i.test(city) ? `${noun} d’${city}` : `${noun} de ${city}`;
      },
      propertyAt: (address) => `le bien situé ${address}`,
      has: {
        pool: 'la piscine que vous vouliez',
        outdoor: 'un extérieur',
        parking: 'un stationnement',
        elevator: 'un ascenseur',
      },
      withList: (items) => `avec ${items.join(', ')}`,
      at: (city) => `à ${city}`,
      selection: (url) => `Votre sélection : ${url}`,
      proposal: {
        noun: { house: 'maison', apartment: 'appartement' },
        margin: (amount) => `${amount} sous votre budget`,
        line: (what, margin) => `J’ai un bien pour vous : ${what}${margin ? `, ${margin}` : ''}.`,
        ask: 'Dites-moi si vous voulez le visiter.',
        subject: 'Un bien pour vous',
      },
      relaunch: {
        ask: (day) => `Avez-vous pu regarder la sélection envoyée le ${day} ?`,
        subjectNoun: { house: 'La maison', apartment: 'L’appartement', other: 'Le bien' },
        fits: (ask, what, feminine) =>
          `${ask} ${what} coche ce que vous cherchez : voulez-vous ${feminine ? 'la' : 'le'} visiter samedi ?`,
        noFit: (ask) => `${ask} Dites-moi quels biens vous voulez visiter.`,
        subject: 'Votre sélection',
      },
      share: {
        message: (url) =>
          [
            `Bonjour, voici les biens que j’ai sélectionnés pour vous : ${url}`,
            'Dites-moi lesquels vous voulez visiter.',
          ].join('\n'),
        subject: 'Votre sélection de biens',
      },
      offer: {
        accepted: (property, day, url) => [
          `Bonne nouvelle : le vendeur a accepté votre offre d’achat pour ${property}, le ${day}.`,
          url ? `Votre offre, signée par vous et par le vendeur : ${url}` : '',
          'Je vous appelle pour la suite chez le notaire.',
        ],
        refused: (property) => [
          `Le vendeur n’a pas retenu votre offre d’achat pour ${property}.`,
          'Je vous appelle pour en parler et voir ensemble la suite.',
        ],
        subject: 'Votre offre d’achat',
      },
      visitConfirm: {
        lines: (property, day, time, url, livingHereUrl) => [
          `Je vous confirme la visite de ${property} le ${day} à ${time}.`,
          `Votre sélection : ${url}`,
          ...(livingHereUrl ? [`Vivre ici, autour du bien : ${livingHereUrl}`] : []),
          'À bientôt,',
        ],
        subject: 'Votre visite',
      },
    },
  },
  sellerVisit: {
    hello: (name) => `Bonjour ${name},`,
    line: (day, opinion) => `La visite de votre bien du ${day} : ${opinion}.`,
    opinions: {
      love: 'l’acquéreur a eu un coup de cœur',
      interested: 'l’acquéreur a été intéressé',
      mixed: 'l’acquéreur est resté mitigé',
      not_for_me: 'le bien n’a pas convaincu l’acquéreur',
    },
    liked: (list) => `Ce qui lui a plu : ${list}.`,
    disliked: (list) => `Ce qui l’a gêné : ${list}.`,
    closing: 'Je reviens vers vous très vite.',
    subject: 'La visite de votre bien',
  },
};
