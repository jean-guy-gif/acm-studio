# Academia par API — Changements proposés à la page de confidentialité (`/confidentialite`)

Pour la juriste, préparé le 14/11/2026, mis à jour le 15/11 (une seule clé pour ACM Studio, la
route bien-client, le lien « Vivre ici » d'un bien hors mandat ; le texte de l'A3, collé à la main,
qui vient avant l'API). La page n'est pas modifiée avant son accord. Aucun appel à
Academia ne s'allume tant que ce texte n'est pas en ligne (décision de Jean-Guy, 14/11).

## Pourquoi ce changement

Aujourd'hui, ACM Studio n'envoie rien à Academia. Il copie l'adresse du bien dans le presse-papiers
du conseiller, qui la colle lui-même dans Academia. C'est le texte validé le 11/11.

Academia (app.myacademia.ai), un service distinct, ouvre une interface de programmation. ACM Studio
pourra donc demander lui-même à Academia, de serveur à serveur, le dossier d'adresse d'un bien et son
lien « Vivre ici ». Pour cela, **l'adresse du bien vendeur part vers Academia**. C'est un nouvel
envoi de données, que la page doit dire.

Ce qui part vers Academia, et seulement cela :

- l'adresse du bien vendeur (numéro, voie, code postal, commune), son type, son nombre de pièces et
  sa surface ; de même, pour un bien proposé à un acquéreur dont l'agence n'a pas le mandat, son
  adresse quand elle est confirmée (trouvée par le Localisateur ou saisie par le conseiller) ; par
  le compte technique d'ACM Studio chez Mon secteur (une seule clé pour tout ACM
  Studio, aucune par conseiller) ;
- une référence opaque du bien, tirée au hasard, sans nom ni signification.

Ce qui ne part jamais vers Academia : le nom du vendeur, ses coordonnées, le prix, le texte ou le
lien d'une annonce, et aucune donnée d'un acquéreur.

Ce qu'ACM Studio garde de la réponse :

- l'identifiant du dossier chez Academia ;
- le lien « Vivre ici », valable 30 jours.

ACM Studio ne garde aucune copie des données d'Academia à l'écran. Seule exception (décision de
Jean-Guy, 14/11) : les données publiques que le conseiller choisit de montrer au vendeur sont
figées dans le document qui lui est remis, avec leur source et leur date. Ces données viennent d'une
route d'Academia qui ne rend que ce que le vendeur peut voir : les ventes avec la rue sans numéro,
l'urbanisme, les permis, les risques, la population, la copropriété. La valeur indicative, le
diagnostic de performance énergétique et les ventes à l'adresse même du bien ne sont jamais montrés
au vendeur.

L'agence de démonstration n'envoie aucune adresse : elle n'ouvre qu'un dossier de démonstration
fixe, fourni par Academia, en mode essai.

Quatre modifications. Les autres paragraphes ne changent pas.

## 1. Paragraphe « Le dossier d'adresse et « Vivre ici » » : premier alinéa remplacé

### Texte actuel (validé le 11/11)

> Le dossier d'adresse et « Vivre ici » : pour le bien vendeur, le conseiller peut ouvrir dans
> Academia (app.myacademia.ai), un service distinct d'ACM Studio, le dossier d'adresse du bien et sa
> fiche « Vivre ici ». ACM Studio copie l'adresse du bien dans le presse-papiers du conseiller, qui
> la colle lui-même dans Academia : ACM Studio n'envoie rien à Academia. Pour un bien dont l'agence a
> le mandat, le conseiller peut enregistrer le lien « Vivre ici » qu'Academia lui donne pour ce
> bien. ACM Studio garde ce lien avec le dossier du vendeur, et le montre à l'acquéreur qui va
> visiter ce bien : sur le lien de sa sélection, et dans le message qui confirme sa visite. En
> ouvrant ce lien, l'acquéreur quitte ACM Studio pour Academia. Aucune donnée de l'acquéreur n'est
> envoyée à Academia. Quand le conseiller confirme une visite, la fiche de l'acquéreur garde le jour
> et l'heure de cette visite.

### Texte proposé (version 2, alignée sur le contrat du 14/11 et la réponse de Jean-Guy)

> Le dossier d'adresse et « Vivre ici » : pour le bien vendeur, le conseiller peut obtenir de Mon
> secteur, le service d'Academia (app.myacademia.ai), distinct d'ACM Studio, le dossier d'adresse
> du bien et sa fiche « Vivre ici ». Quand le conseiller le demande, ACM Studio envoie à Mon
> secteur, par le compte d'ACM Studio, l'adresse du bien, son type, son nombre de pièces, sa
> surface et une référence sans signification, et rien d'autre ; il peut le faire aussi pour un
> bien qu'il propose à un acquéreur et dont l'agence n'a pas le mandat, quand l'adresse de ce bien
> est connue : ni le nom, ni les coordonnées du
> vendeur ou d'un
> acquéreur, ni le texte ou le lien d'une annonce. Mon secteur renvoie des données publiques sur
> l'adresse et son quartier (ventes, urbanisme, risques, population, copropriété, diagnostic de
> performance énergétique) et une valeur de marché indicative ; elles sont montrées au conseiller,
> qui seul voit la valeur indicative et le diagnostic. ACM Studio garde seulement de quoi retrouver
> le dossier, sans en garder de copie à l'écran. Le conseiller peut choisir de montrer au vendeur,
> pendant le rendez-vous et dans le document qui lui est remis, certaines de ces données publiques
> (les ventes autour, avec leur rue sans numéro, jamais une vente à l'adresse même du bien ;
> l'urbanisme, les permis, les risques, la population, la copropriété) : ce qu'il a choisi est
> alors figé dans ce document, avec sa source et sa date, et gardé avec le dossier du vendeur. Le
> lien « Vivre ici », valable 30 jours, peut être donné au vendeur et à l'acquéreur qui va visiter
> un bien ; en l'ouvrant, ils quittent ACM Studio pour Academia. Pour un bien dont l'agence n'a pas
> le mandat, cette page montre la rue, sans numéro, et un repère à environ 100 mètres du bien.
> Aucune donnée de l'acquéreur n'est envoyée à Academia. Quand le conseiller confirme une visite,
> la fiche de l'acquéreur garde le jour et l'heure de cette visite.

[À ajuster selon les réponses en attente : si Academia est nommé à côté de la source publique
devant le vendeur ; la durée de conservation chez Mon secteur (A4) ; la prolongation d'un lien
client, demandée à Laurent.]

La phrase « ACM Studio n'envoie rien à Academia » disparaît : elle deviendrait fausse.

La phrase préparée le 09/11 pour le lien direct (« l'adresse du bien part vers Academia, dans
l'adresse de la page ouverte ») n'est plus nécessaire : le texte proposé couvre ce cas.

## 2. Second alinéa du même paragraphe (l'effacement des anciens documents)

> Jusqu'au 9 novembre 2026, ACM Studio préparait lui-même ces deux documents […] effacés au plus
> tard le 23 novembre 2026. […]

L'effacement a été fait le 11/11 (migration `effacer_m147`). Cet alinéa peut être retiré à la mise en
ligne du texte proposé, ou gardé tel quel : **à la juriste de choisir**.

## 3. Section « Où sont les données » : une ligne ajoutée

À la suite de la ligne de Stream Estate :

> Mon secteur, d'Academia (app.myacademia.ai) : l'adresse du bien vendeur, ou d'un bien proposé à
> un acquéreur, son type, son nombre de pièces et sa surface, par le compte d'ACM Studio, quand le conseiller demande son dossier
> d'adresse ou son lien « Vivre ici ». Ni le nom, ni l'e-mail, ni le téléphone du vendeur ou d'un
> acquéreur ne lui sont transmis.

## 4. Section « Qui est responsable » : selon la réponse à la question 1

Rien n'est proposé avant la réponse à la question 1.

## A3 — Avant l'API : le lien « Vivre ici » collé à la main sur tout bien proposé

Cette partie vient avant l'API et se valide à part. La mission A3 (décision de Jean-Guy, 15/11)
permet au conseiller de coller le lien « Vivre ici » d'Academia sur tout bien qu'il propose à un
acquéreur, et non plus seulement sur un bien dont l'agence a le mandat. ACM Studio n'envoie toujours
rien à Academia : le conseiller colle lui-même l'adresse dans Academia. Mais le texte validé le 11/11
devient faux sur deux points. Le lien d'un bien hors mandat est montré à l'acquéreur. Et la page
d'Academia montre alors la rue de ce bien, sans numéro, et un repère à environ 100 mètres.

### Texte actuel (validé le 11/11), deux phrases

> […] ACM Studio copie l'adresse du bien dans le presse-papiers du conseiller, qui la colle lui-même
> dans Academia : ACM Studio n'envoie rien à Academia. Pour un bien dont l'agence a le mandat, le
> conseiller peut enregistrer le lien « Vivre ici » qu'Academia lui donne pour ce bien. ACM Studio
> garde ce lien avec le dossier du vendeur, et le montre à l'acquéreur qui va visiter ce bien : sur
> le lien de sa sélection, et dans le message qui confirme sa visite. […]

### Texte proposé pour l'A3

> […] ACM Studio copie l'adresse du bien dans le presse-papiers du conseiller, qui la colle lui-même
> dans Academia : ACM Studio n'envoie rien à Academia. Le conseiller peut enregistrer le lien
> « Vivre ici » qu'Academia lui donne pour un bien dont l'agence a le mandat, ou pour un autre bien
> qu'il propose à un acquéreur. ACM Studio garde ce lien, avec le dossier du vendeur pour un bien en
> mandat, sinon avec ce bien, dans l'agence. Il le montre à l'acquéreur à qui le bien est proposé :
> sur le lien de sa sélection, et dans le message qui confirme sa visite. Pour un bien dont l'agence
> n'a pas le mandat, la page « Vivre ici » d'Academia montre la rue du bien, sans numéro, et un
> repère à environ 100 mètres ; c'est le conseiller qui choisit de partager ce lien. […]

La question 5 ci-dessous vaut pour ce texte. Aucun lien d'un bien hors mandat ne part vers un
acquéreur avant que ce texte soit validé et en ligne.

## Questions pour la juriste

1. **Le rôle d'Academia.** Depuis le 15/11, ACM Studio appelle Mon secteur par une seule clé, celle
   d'un compte technique d'ACM Studio, et non plus au nom du compte de chaque conseiller. Academia
   est-il alors :
   - un sous-traitant de l'agence ;
   - un sous-traitant de l'éditeur, comme Amazon Web Services pour la lecture des notes ;
   - ou un responsable de traitement distinct ?

   Faut-il le nommer dans « Qui est responsable », avec un renvoi vers sa propre politique de
   confidentialité ?
2. **L'information du vendeur.** L'adresse de son bien part vers un service tiers. La mention sur
   cette page suffit-elle, ou faut-il l'informer ailleurs (par exemple dans le mandat ou la
   synthèse) ?
3. **Les ventes montrées au vendeur (D7).** La rue sans numéro, la distance, la date, la surface et
   le prix d'une vente (données DVF) : suffisent-ils à ne pas ré-identifier les personnes, comme
   l'exigent les conditions de réutilisation de DVF ? Faut-il un nombre minimal de ventes dans la
   rue, ou la distance seule ? Les ventes à l'adresse même du bien ne sont plus demandées : la route
   d'Academia ne les rend pas.
4. **La durée de conservation chez Academia.** Combien de temps Academia garde-t-il l'adresse et le
   dossier ? La page doit-elle le dire, ou renvoyer vers Academia ? À demander à Laurent avec sa doc.
5. **La rue d'un bien hors mandat devant l'acquéreur (l'A3, puis l'API).** Pour un bien dont l'agence n'a pas le
   mandat, souvent localisé par le Localisateur, la page « Vivre ici » montre à l'acquéreur la rue,
   sans numéro, et un repère à environ 100 mètres. C'est le conseiller qui choisit de partager ce
   lien. La mention proposée dans le paragraphe 1 suffit-elle, pour le propriétaire de ce bien ?
6. **L'adresse d'un bien hors mandat envoyée à Academia (avec l'API seulement).** Avec l'API, ACM
   Studio enverrait lui-même à Mon secteur l'adresse d'un bien dont l'agence n'a pas le mandat,
   souvent trouvée par le Localisateur. Son propriétaire n'est pas client de l'agence. La mention
   proposée suffit-elle, ou faut-il s'en tenir au geste à la main pour ces biens ?
