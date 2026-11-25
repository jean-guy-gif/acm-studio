# MISSION 137 — Le bon de visite et l'offre d'achat

**Date** : 06/11/2026 · **Origine** : réunion Plaud du 03/11 (« Parcours acquéreur, de la découverte à
l'offre ») et décision de Jean-Guy du 06/11 : « tout centralisé, faire gagner du temps de la conversion aux
conseillers ». Modèles fournis par Jean-Guy, **validés juridiquement** : un bon de visite (3 pages) et une
offre d'achat ferme (5 pages + couverture). Ils ne sont pas dans le dépôt (ils contiennent de vrais
clients) ; leurs **textes juridiques** sont reproduits ci-dessous, sans aucune donnée client.

Équipe allégée. Une migration probable (l'identité légale de l'agence, les documents générés) : gardien-sql,
arrêt, Jean-Guy applique. Toute donnée personnelle ajoutée est signalée au rapport (relecture du
paragraphe de `/confidentialite` par le juriste).

## Le principe
1. **Les textes juridiques sont repris mot pour mot.** On ne réécrit, ne raccourcit ni ne « simplifie »
   aucune clause. Seuls changent les champs entre accolades.
2. **Rien d'Infinity** : ni logo, ni couleurs, ni nom, ni adresse, ni numéro. Tout vient de l'agence qui
   utilise ACM (charte `agency_branding`, Identité légale § A).
3. **Tout ce qu'ACM sait déjà se remplit seul** ; le reste se saisit une fois, sur un seul écran, au
   pouce (tablette ou téléphone).

## A. L'identité légale de l'agence (Administration → Identité)
4. Existent déjà : nom du document, adresse postale, carte professionnelle et organisme qui la délivre,
   garantie financière (texte libre), site, logos, couleurs. **À ajouter** (manager seul, une fois) :
   - société : raison sociale, forme (SAS, SARL…), capital, siège, RCS (ville et numéro), n° de TVA ;
   - téléphone et e-mail de l'agence ;
   - responsabilité civile professionnelle : assureur, son adresse, n° de contrat ;
   - garantie financière : organisme, son adresse, n° d'adhésion, montant (remplace le texte libre, repris
     s'il existe) ;
   - représentant légal : nom et qualité (« Président », « Gérant ») ;
   - appartenance à un réseau : oui / non (voir question 2).
5. Tant que l'identité légale est incomplète, « Bon de visite » et « Offre d'achat » disent ce qui manque
   et mènent à Identité ; aucun document incomplet n'est produit.

## B. Le bon de visite
6. **Où** : sur une visite planifiée (Visites, M119) et sur la fiche acquéreur, « Bon de visite ». Il peut
   porter **plusieurs biens** visités le même jour par le même acquéreur.
7. **Ce qui se remplit seul** : l'agence (§ A) ; le visiteur (fiche acquéreur : nom, et l'adresse si
   connue) ; pour chaque bien : n° de mandat, prix de commercialisation, adresse du bien ; le conseiller qui
   présente ; la ville et la date.
8. **Ce qui se saisit sur place** : l'adresse du visiteur si absente, la pièce d'identité (« comme en atteste
   : CNI / passeport / … », type seul, jamais le numéro ni l'image), le n° de mandat s'il manque.
9. **Biens hors mandat de l'agence** (un bien du marché visité en collaboration, M120) : le bon de visite
   n'est proposé que pour les biens de l'agence ou en collaboration obtenue ; sinon le bouton dit pourquoi.
10. **Signature** : sur la tablette ou le téléphone du conseiller, au doigt, avec « Lu et approuvé » (voir
    question 1). Le PDF signé est gardé sur la visite et envoyé au visiteur (Copier / E-mail).

### Texte validé — Bon de visite (reproduire mot pour mot)

**BON DE VISITE - BIEN(S) A VENDRE**

**L'AGENCE**
{Agence.nom} , située {Agence.adresse} , téléphone {Agence.telephone} , adresse mail {Agence.email} ,
exploitée par la société {Société.raison_sociale} {Société.forme} au capital de {Société.capital} euros,
dont le siège social est situé {Société.siege} , RCS {Société.rcs_ville} n° {Société.rcs_numero} ,
titulaire de la carte professionnelle Transaction sur immeubles et fonds de commerce n° {Carte.numero}
délivrée par {Carte.organisme} , numéro de TVA {Société.tva} , assurée en responsabilité civile
professionnelle par {RCP.assureur} dont le siège est sis {RCP.adresse} sur le territoire national sous le
n° {RCP.numero} ,
Adhérente de la caisse de Garantie {Garantie.organisme} dont le siège est sis {Garantie.adresse} sous le
n° {Garantie.numero} ,
DECLARANT NE POUVOIR NI RECEVOIR NI DETENIR D'AUTRES FONDS, EFFETS OU VALEURS QUE CEUX REPRESENTATIFS DE
SA REMUNERATION
N'ayant aucun lien capitalistique ou juridique avec une banque ou une société financière,
Représentée par {Représentant.nom} , agissant en sa qualité de {Représentant.qualite} , ayant tous
pouvoirs à l'effet des présentes,

**DECLARATIONS**
Je soussigné(e) {Visiteur.civilite_nom} , demeurant {Visiteur.adresse} , comme en atteste
{Visiteur.piece}
Agissant tant en mon nom personnel que pour le compte de toute autre personne physique ou morale que je
jugerai bon de me substituer et pour laquelle je me porte fort, en tant que de besoin.
Reconnais m'être présenté(e) ce jour à l'Agence, avoir demandé et reçu de celle-ci les renseignements,
adresses et conditions de vente des biens ci-dessous désignés, précisés notamment dans le mandat de
vente.
Ces biens, dont je n'avais aucune connaissance auparavant, m'ont été présentés pour la première fois et
uniquement par l'Agence.
Je sais que ces indications ont été fournies selon les dires des vendeurs et qu'elles sont
confidentielles. Je m'engage à les garder secrètes.
Je suis informé(e) que le vendeur s'est engagé, dans le cadre du mandat de vente qu'il a confié à
l'Agence, à ne pas traiter la vente de ces biens directement avec un acquéreur présenté par l'Agence ou
ayant visité le bien avec l'Agence.
Je m'engage à ne pas me présenter chez les vendeurs sans être accompagné(e) d'un représentant de l'Agence
ou, à défaut, sans communiquer auxdits vendeurs le présent bon de visite. Je m'engage également à en
informer toute personne qui me présenterait les mêmes biens que ceux qui m'ont déjà été présentés.
Je m'engage à ne pas tenter d'évincer l'Agence de la rémunération à laquelle elle pourrait légitimement
prétendre.
En cas de manquement à cet engagement, je suis informé(e) que je pourrai être tenu(e) de réparer le
préjudice que constituerait l'éviction de l'Agence par le versement d'un dédommagement égal au montant des
honoraires auxquels elle aurait pu prétendre.

**BIEN(S) PROPOSE(S) A LA VENTE**
(pour chaque bien) Numéro du mandat : {Bien.mandat} · Prix de commercialisation : {Bien.prix} € · Adresse
du bien : {Bien.adresse}
Les biens ci-dessus mentionnés ont été présentés par {Conseiller.nom} .

**Collecte et exploitation des données personnelles**
L'Agence {et le réseau d'agences auquel elle appartient} sont responsables des traitements des données à
caractère personnel collectées à l'occasion des présentes.
Les principales finalités de ces traitements sont la gestion, le traitement et le suivi des demandes
concernant l'Agence {et le réseau}, la gestion des fichiers clients-prospects et la réalisation
d'opérations de marketing direct, la lutte contre le blanchiment de capitaux et le financement du
terrorisme et, plus généralement, les finalités décrites dans la Politique générale de protection des
données consultable sur le site {du réseau | de l'Agence} ou, sur simple demande, auprès de l'Agence.
Ces données à caractère personnel sont destinées aux services et personnels habilités des responsables
{du réseau, de ses agences | de l'Agence}, ainsi qu'à leurs partenaires et prestataires, contractuels et
commerciaux.
Ces traitements se fondent soit sur le présent contrat, soit sur le respect d'obligations légales, soit
sur la poursuite d'intérêts légitimes, à savoir la gestion et le suivi de de relations commerciales et
l'organisation d'opérations de marketing, de prospection et de communication. A défaut de correspondre à
l'une de ces trois bases légales, le traitement des données à caractère personnel collectées sera fondé
sur le consentement de la personne concernée, notamment si elles sont transmises à des partenaires
commerciaux de l'Agence {ou du réseau}.
Le CLIENT pourra demander à l'Agence d'accéder aux données à caractère personnel le concernant, de les
rectifier, de les modifier, de les supprimer ou de s'opposer à leur exploitation en adressant un courriel
en ce sens à {Agence.email} ou un courrier postal à l'adresse suivante : {Agence.adresse} . Toute
réclamation pourra être introduite auprès de la Commission Nationale de l'Informatique et des Libertés
(www.cnil.fr).
Le consommateur est informé qu'il peut s'opposer à l'utilisation de ses coordonnées téléphoniques à des
fins de prospection commerciale en s'inscrivant sur la liste d'opposition au démarchage téléphonique sur
le site internet bloctel.gouv.fr ou par courrier à l'adresse : Worldline - Service Bloctel - CS 61311 -
41013 BLOIS CEDEX

**SIGNATURE(S)**
Fait à {Agence.ville} , le {Date} . — SIGNATURE(S) « Lu et approuvé »

(Le modèle d'origine porte une coquille, « de de relations commerciales » : elle est gardée telle quelle
tant que le juriste ne l'a pas corrigée.)

## C. L'offre d'achat
11. **Où** : sur une visite faite avec l'issue « Offre envisagée » (M119), et sur la fiche acquéreur.
12. **Ce qui se remplit seul** : l'agence (§ A) ; le n° de mandat ; l'adresse et la description du bien
    (dossier vendeur : type, pièces, étage, annexes, copropriété M86 — lots et tantièmes si connus) ;
    le prix de commercialisation (proposé comme point de départ du prix offert) ; les honoraires et leur
    charge (mandat) ; les offrants depuis la fiche acquéreur.
13. **Ce qui se saisit sur un seul écran** :
    - les offrants : civilité, nom, prénoms, date et lieu de naissance, nationalité, profession, adresse,
      situation matrimoniale et régime, résidence fiscale (France / hors France) ;
    - le prix offert (en chiffres ; **en lettres calculé par ACM**), les honoraires, l'acompte ;
    - le financement : **sans prêt** (clause de renonciation ci-dessous) ou **avec prêt** (montant, durée,
      taux maximum : clause de condition suspensive de prêt — **texte à fournir par Jean-Guy**, question 3) ;
    - la date de validité de l'offre et la date limite de l'avant-contrat ;
    - les lots et la désignation cadastrale si absents du dossier ;
    - l'agent commercial apporteur, s'il y en a un (paragraphe présent seulement dans ce cas).
14. **La couverture** reprend la mise en page du modèle (photo du bien ou visuel de l'agence, logo de
    l'agence, nom, adresse, téléphone, e-mail, site, « OFFRE D'ACHAT FERME », « Mandat n° … »), aux couleurs
    de l'agence. Rien du modèle Infinity n'est gardé.
15. **Signature** : voir question 1. Après signature de l'offrant, l'offre part au vendeur pour acceptation
    (un lien, comme le dossier acquéreur) ; la date limite de validité est rappelée dans « À faire
    aujourd'hui » du conseiller la veille.

### Texte validé — Offre d'achat ferme (reproduire mot pour mot)

OFFRE D'ACHAT
**En présence et avec le concours de l'Agence**
{même paragraphe d'identification de l'Agence que le bon de visite, avec, après le n° d'adhésion à la
garantie : « pour un montant de {Garantie.montant} € »}
DECLARANT NE POUVOIR NI RECEVOIR NI DETENIR D'AUTRES FONDS, EFFETS OU VALEURS QUE CEUX REPRESENTATIFS DE
SA REMUNERATION.
N'ayant aucun lien capitalistique ou juridique avec une banque ou une société financière,
Représentée par {Représentant.nom} , agissant en sa qualité de {Représentant.qualite} , ayant tous
pouvoirs à l'effet des présentes,
Ci-après "l'Agence" ou "le Mandataire",

**L'OFFRANT**
{pour chaque offrant : Civilité Nom Prénoms né(e) le {date} à {lieu} , de nationalité {nationalité} ,
{profession}} , demeurant {adresse} ,
{Se déclarant {situation et régime matrimonial, date et lieu du mariage}, ledit régime n'ayant subi aucune
modification conventionnelle ou judiciaire depuis,}
{Ayant | N'ayant pas} leur résidence fiscale en France, au sens de la règlementation fiscale.
Ci-après "l'OFFRANT"
L'OFFRANT s'engage à acquérir, aux conditions arrêtées ci-après, avec faculté de substitution, les biens
immobiliers ci-dessous désignés.
L'OFFRANT reconnait que ces conditions ont été négociées par l'Agence titulaire d'un mandat de négociation
régulièrement inscrit sur son Registre des mandats sous le numéro {Mandat.numero} .
{si agent commercial : Ce mandat a été apporté par {Agent.nom}, agissant en sa qualité d'agent commercial,
régulièrement inscrit au Registre spécial des Agents commerciaux sous le numéro {Agent.rsac} .}

**Nature et description des biens**
{si copropriété : Dans un ensemble immobilier soumis au régime de la copropriété tel que défini par la loi
du 10 juillet 1965 situé {adresse} .}
Cet ensemble immobilier étant édifié sur une parcelle de terrain cadastrée : {tableau Préfixe · Section ·
Numéro · Lieudit · Contenance} Soit une contenance totale de {contenance} .
Adresse postale des biens : {adresse}
{pour chaque lot : LOT NUMERO {en lettres} ( {n°} ) Description : {description} Et les {tantièmes en
lettres} / {base} ( {n} / {base} èmes) des parties communes générales .}

**Conditions d'acquisition**
Prix d'acquisition
L'OFFRANT déclare son intention d'acquérir les biens ci-dessus désignés au prix de {prix en lettres}
euros ( {prix} €).
Les honoraires de l'Agence seront à la charge du {VENDEUR | ACQUEREUR}.
Le montant de ces honoraires sera de {honoraires en lettres} euros ( {honoraires} €).
L'OFFRANT supportera en plus l'ensemble des frais, droits et émoluments relatifs à la vente.

Financement de l'acquisition
{sans prêt :} L'OFFRANT déclare ne pas avoir l'intention de recourir à un prêt pour financer son
acquisition. Par conséquent, en cas d'acceptation de son offre par le VENDEUR, l'OFFRANT devenu acquéreur
s'engage à reproduire dans l'avant-contrat de vente ou dans une déclaration qui lui sera annexée et à
laquelle cet avant-contrat fera référence la mention manuscrite de renonciation à la condition suspensive
d'obtention d'un prêt prévue par l'article L. 313-42 du Code de la consommation.
{avec prêt : PROJET de clause, voir « Clause avec prêt » plus bas — désactivée tant que le juriste ne l'a pas validée}

Autres conditions de l'acquisition
Les biens devront, au jour du transfert de propriété, être libres de tout titre locatif et de toute
occupation.
Outre les conditions ordinaires et de droit, la vente sera soumise aux conditions suspensives suivantes :
- le certificat d'urbanisme ou les titres de propriété ne devront révéler aucune charge réelle ou
servitude grave pouvant déprécier la valeur des biens objet des présentes ou altérer de manière
significative la jouissance de l'ACQUEREUR,
- l'état hypothécaire ne devra révéler aucune inscription de privilège ou d'hypothèque garantissant des
créances dont le solde, en capital, intérêts et accessoires, ne pourra être remboursé à l'aide du prix de
vente.

**Acceptation de l'offre par le VENDEUR**
Cette offre d'achat est valable jusqu'au {date de validité} inclus.
Passé cette date, et à défaut d'acceptation par le VENDEUR, elle deviendra caduque, sans autre formalité,
sauf accord contraire de l'OFFRANT.
L'acceptation de vendre aux conditions de la présente offre devra être actée par la signature de celle-ci
par le VENDEUR.
Elle sera notifiée à l'OFFRANT au plus tard le dernier jour de validité de l'offre.
Un avant-contrat de vente devra ensuite être signé par le VENDEUR et l'OFFRANT au plus tard le {date
avant-contrat} {si copropriété : sous réserve d'avoir l'ensemble des documents administratifs relatifs au
dossier de vente dont le PACK ALUR et le PRE ETAT DATE délivrés par le syndic de copropriété.}
L'OFFRANT devenu ACQUEREUR versera la somme de {acompte en lettres} euros ( {acompte} €) à titre d'acompte
dans les conditions définies par l'avant-contrat.
L'offre acceptée constitue un accord sur la chose et sur le prix au sens des articles 1583 et 1589 du Code
civil.
En cas de refus de réitérer la présente :
- le VENDEUR pourra être contraint de vendre les biens susvisés par tous les moyens et voies de droit, en
supportant les frais de poursuites. S'il venait à décéder, ses héritiers et ayants droit seront tenus
d'exécuter la présente ;
- L'OFFRANT sous réserve de la levée des éventuelles conditions suspensives applicables ou de l'exercice
d'un éventuel droit de rétractation, sera tenu d'acheter. Toutefois, s'il venait à décéder, ses héritiers
et ayants droit auront la faculté de se désister sans indemnité.
L'OFFRANT bénéficiera à la suite de la signature de l'avant-contrat de vente d'un délai de rétractation de
10 jours conformément aux dispositions de l'article L. 271-1 du code de la construction et de
l'habitation.
L'ACQUEREUR et le VENDEUR autorisent expressément le(s) notaire(s) à communiquer à l'AGENCE le projet
d'avant-contrat ainsi que l'avant-contrat de vente signé, le projet d'acte authentique ainsi que l'acte
authentique qui seront établis dans le cadre de la présente vente.

**Données personnelles**
L'OFFRANT est informé que les données à caractère personnel le concernant collectées par le MANDATAIRE à
l'occasion de la présente feront l'objet de traitements informatiques. Ces traitements se fondent soit
sur la présente offre, soit sur le respect d'obligations légales, soit sur la poursuite d'intérêts
légitimes.
L'Agence {et le réseau d'agences auquel elle appartient} sont responsables des traitements des données à
caractère personnel collectées à l'occasion des présentes.
Ces données sont collectées et traitées aux fins de la réception et de la gestion de la présente offre
d'achat, de sa transmission au vendeur, de la réalisation des opérations confiées, du suivi de la
relation commerciale et de communication, de la gestion des fichiers clients-prospects, du respect des
obligations légales et réglementaires applicables à l'activité de l'agence, notamment en matière de lutte
contre le blanchiment de capitaux et le financement du terrorisme et, plus généralement, les finalités
décrites dans la Politique générale de protection des données consultable sur le site {du réseau | de
l'Agence} ou, sur simple demande, auprès de l'Agence.
Les données à caractère personnel sont destinées aux services et personnels habilités des responsables
{du réseau, de ses agences | de l'Agence} ainsi qu'aux intervenants participant à la réalisation de
l'opération ou à l'exécution d'obligations légales ou réglementaires, notamment les notaires,
établissements bancaires, assureurs, avocats, commissaires de justice, prestataires de signature
électronique, prestataires de lettre recommandée électronique et, le cas échéant, aux professionnels de
l'immobilier intervenant dans le cadre d'un partenariat nécessaire à l'exécution de la mission confiée.
L'OFFRANT est également informé que ces données à caractère personnel pourront également être destinées
aux opérations de prospection du MANDATAIRE dans le respect de la règlementation en vigueur.
Les données à caractère personnel sont conservées pendant la durée nécessaire à l'exécution des
présentes, augmentée des délais légaux de prescription applicables.
L'OFFRANT pourra demander à l'Agence d'accéder aux données à caractère personnel la concernant, de les
rectifier, de les modifier, de les supprimer ou de s'opposer à leur exploitation en adressant un courriel
en ce sens à {Agence.email} ou un courrier postal à l'adresse suivante : {Agence.adresse} . Toute
réclamation pourra être introduite auprès de la Commission Nationale de l'Informatique et des Libertés
(www.cnil.fr).
Le consommateur est informé que toute sollicitation téléphonique effectuée à des fins commerciales
suppose son consentement préalable, sauf si elle intervient dans le cadre autorisé par la réglementation
en vigueur et notamment dans le cadre de l'exécution d'un contrat en cours au sens du quatrième alinéa de
l'article L223-1 du Code de la consommation.

**Signature**
En la signant électroniquement, L'OFFRANT ACCEPTE D'ACQUERIR LES BIENS AUX PRIX ET CONDITIONS CONTENUS DANS
LA PRESENTE OFFRE D'ACHAT.

### Clause avec prêt — PROJET, à faire valider par le juriste
Rédigée le 06/11 sur le modèle de la clause « sans prêt » validée, d'après l'article L. 313-41 du Code de
la consommation (la condition suspensive de prêt ne peut être inférieure à un mois) et les modèles
publics (montant, durée, taux maximum). **Codée mais désactivée** : l'option « avec prêt » n'apparaît
qu'une fois une constante `OFFRE_AVEC_PRET_VALIDEE` passée à vrai par Jean-Guy, après le juriste.

L'OFFRANT déclare avoir l'intention de financer son acquisition au moyen d'un apport personnel de {apport
en lettres} euros ( {apport} €) et d'un ou plusieurs prêts d'un montant total maximum de {montant en
lettres} euros ( {montant} €), d'une durée maximale de {durée} ans, au taux nominal maximum de {taux} % l'an
hors assurance.
Par conséquent, en cas d'acceptation de son offre par le VENDEUR, l'avant-contrat de vente sera conclu
sous la condition suspensive de l'obtention de ce ou ces prêts, conformément aux articles L. 313-40 et
suivants du Code de la consommation. La durée de validité de cette condition suspensive, fixée dans
l'avant-contrat, ne pourra être inférieure à un mois à compter de sa signature.
L'OFFRANT devenu acquéreur s'engage à déposer sa ou ses demandes de prêt dans un délai de {délai} jours à
compter de la signature de l'avant-contrat et à en justifier à l'Agence et au VENDEUR.

## Décisions de Jean-Guy du 06/11
1. **Signature au doigt** pour le bon de visite **et** pour l'offre, pour le moment (PDF horodaté, gardé
   sur la visite). Pas de prestataire de signature électronique en v1.
2. **Agence seule** : on retire toute mention du réseau. Les accolades {… réseau …} des deux textes
   deviennent : « L'Agence est responsable des traitements… », « …concernant l'Agence… », « …sur le site
   de l'Agence… », « …des responsables de l'Agence… », « …partenaires commerciaux de l'Agence. ».
3. **Offre avec prêt** : clause projet ci-dessus, désactivée jusqu'à la validation du juriste.

## Questions à Jean-Guy (avant de coder) — tranchées, voir ci-dessus
1. **La signature.** Le bon de visite peut se signer au doigt sur la tablette (signature électronique
   simple, PDF horodaté). L'offre d'achat dit « En la signant électroniquement » : une signature au doigt
   suffit-elle, ou faut-il un prestataire de signature électronique (Yousign, DocuSign…) ? Sans réponse,
   v1 : l'offre se génère en PDF et se signe avec l'outil habituel de l'agence ; ACM garde le PDF signé
   qu'on lui redonne.
2. **« Le réseau d'agences auquel elle appartient »** : pour une agence indépendante, le juriste valide-t-il
   les variantes entre accolades ({du réseau | de l'Agence}) ?
3. **L'offre avec prêt** : il faut le texte validé de la condition suspensive de prêt (montant, durée, taux
   maximum, délai d'obtention).

## Démo
Une visite des Bernard (Vence) avec un bon de visite signé ; une visite des Keller « Offre envisagée » qui
produit une offre complète. Identité légale de l'agence de démo entièrement fictive et crédible (raison
sociale inventée, RCS, TVA et numéros fictifs mais au bon format), téléphones en 06 39 98.

## Preuves
- Tests : chaque texte validé est rendu à l'identique (instantané du texte, champs remplacés) ; montants en
  lettres (de 1 € à 9 999 999 €) ; identité incomplète → aucun document ; paragraphe agent commercial et
  copropriété seulement si renseignés.
- Rendus : les deux PDF A4 de la démo, comparés côte à côte au modèle (mise en page, aucune trace
  d'Infinity).
