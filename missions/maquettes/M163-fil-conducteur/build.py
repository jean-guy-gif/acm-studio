"""Maquette M163 : l'Étude de marché en fil conducteur (dossier de démo de Vence, Mme Garcia).
Produit etude.html, etude.pdf (A4) et une image par page."""
import html

BRAND = "#013a58"
BRAND2 = "#00527a"
GOLD = "#e8a33d"
ADV = "Claire Dumas"
ADV_INIT = "CD"
DATE = "19 novembre 2026"
TOTAL = 8

def e(s):
    return html.escape(s)

# ---------- données de la démo (Vence) ----------
CONCURRENTS = [
    dict(n=1, lib="Maison · 5 pièces · 135 m² · Saint-Paul-de-Vence", prix="740 000 €", m2="5 481 €/m²", jours=35, photo="maison-02.jpg",
         diffs=[("Exposition", "Sud-Est (vous : Sud)", "vous")],
         eq="surface, DPE, pièces, chambres, état, GES, extérieur, stationnement"),
    dict(n=2, lib="Maison · 5 pièces · 142 m² · Vence, Les Collines", prix="729 000 €", m2="5 134 €/m²", jours=72, photo="maison-04.jpg",
         diffs=[("Surface", "142 m² (vous : 135 m²)", "lui"), ("Exposition", "Sud-Ouest (vous : Sud)", "vous")],
         eq="DPE, pièces, chambres, état, GES, extérieur, stationnement"),
    dict(n=3, lib="Maison · 5 pièces · 132 m² · La Colle-sur-Loup", prix="749 000 €", m2="5 674 €/m²", jours=90, photo="maison-03.jpg",
         diffs=[], eq="surface, DPE, pièces, chambres, état, GES, extérieur, stationnement, exposition"),
    dict(n=4, lib="Maison · 5 pièces · 130 m² · Vence, Les Collines", prix="715 000 €", m2="5 500 €/m²", jours=45, photo="villa-02.jpg",
         diffs=[], eq="surface, DPE, pièces, chambres, état, GES, extérieur, stationnement, exposition"),
    dict(n=5, lib="Maison · 5 pièces · 150 m² · Vence, Les Collines", prix="760 000 €", m2="5 067 €/m²", jours=110, photo="villa-04.jpg",
         diffs=[("Surface", "150 m² (vous : 135 m²)", "lui")],
         eq="DPE, pièces, chambres, état, GES, extérieur, stationnement, exposition"),
]

# (année, mois, rue, pièces, surface, distance, prix, choisie)
VENTES = [
    (2025, 11, "Rue des Oliviers", 6, 147, 150, 1018452, False),
    (2025, 11, "Boulevard Maréchal Juin", 5, 118, 100, 876800, False),
    (2025, 9, "Chemin du Val Fleuri", 7, 163, 50, 1116476, False),
    (2025, 4, "Boulevard Maréchal Juin", 6, 160, 250, 1092363, False),
    (2025, 3, "Boulevard Maréchal Juin", 4, 105, 200, 722110, False),
    (2025, 1, "Boulevard Maréchal Juin", 4, 104, 150, 765807, False),
    (2024, 10, "Boulevard Maréchal Juin", 6, 139, 100, 811390, True),
    (2024, 4, "Chemin du Val Fleuri", 5, 119, 150, 945575, False),
    (2023, 12, "Chemin des Collettes", 7, 169, 200, 970806, False),
    (2023, 12, "Chemin du Val Fleuri", 6, 147, 150, 758764, False),
    (2023, 7, "Boulevard Maréchal Juin", 5, 134, 250, 783266, True),
    (2023, 3, "Boulevard Maréchal Juin", 5, 114, 100, 615551, False),
    (2023, 3, "Avenue de Nice", 5, 121, 250, 663830, False),
    (2023, 2, "Chemin du Val Fleuri", 4, 101, 200, 537324, False),
    (2023, 2, "Avenue de Nice", 4, 103, 150, 559795, False),
    (2022, 10, "Rue des Oliviers", 5, 133, 50, 847604, True),
    (2022, 4, "Avenue de Nice", 5, 125, 100, 640615, True),
    (2022, 1, "Chemin des Collettes", 5, 132, 150, 754667, True),
    (2021, 12, "Rue des Oliviers", 5, 123, 250, 879320, False),
    (2021, 8, "Chemin du Val Fleuri", 5, 136, 150, 628193, True),
    (2021, 4, "Chemin des Collettes", 4, 102, 200, 583329, False),
    (2021, 3, "Avenue de Nice", 7, 166, 150, 1061139, False),
    (2021, 3, "Rue des Oliviers", 4, 109, 200, 560210, False),
    (2021, 2, "Boulevard Maréchal Juin", 5, 117, 150, 669325, False),
]
MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"]

def eur(v):
    return f"{v:,}".replace(",", " ") + " €"

CLASSEMENT = [
    (1, "Maison · 5 p. · 130 m² · Vence, Les Collines", "en vente depuis 45 jours", "715 000 €", "g", False),
    (2, "Maison · 5 p. · 142 m² · Vence, Les Collines", "en vente depuis 72 jours", "729 000 €", "g", False),
    (3, "Maison · 5 p. · 135 m² · Saint-Paul-de-Vence", "en vente depuis 35 jours", "740 000 €", "o", False),
    (4, "VOTRE MAISON · 5 p. · 135 m² · Vence, Les Collines", "prix retenu ensemble", "745 000 €", "o", True),
    (5, "Maison · 5 p. · 132 m² · La Colle-sur-Loup", "en vente depuis 90 jours", "749 000 €", "r", False),
    (6, "Maison · 5 p. · 150 m² · Vence, Les Collines", "en vente depuis 110 jours", "760 000 €", "r", False),
]

# ---------- briques ----------
def footer(n):
    return f'<div class="foot"><span>Étude de marché · Maison à Vence · {DATE}</span><span>{n} / {TOTAL}</span></div>'

def avis(texte):
    return f'''<div class="avis"><div class="ini">{ADV_INIT}</div><div><div class="avis-l">L'avis de {ADV}, votre conseillère</div>
<div class="avis-t">{texte}</div></div></div>'''

def band(num, titre, sous, side=""):
    num_html = f'<div class="chap">{num}</div>' if num else ""
    return f'''<div class="band{' band-side' if side else ''}"><div class="band-txt">{num_html}<h1>{titre}</h1><p class="lead">{sous}</p></div>{side}</div>'''

def source(t):
    return f'<p class="src">{t}</p>'

def chip(kind):
    if kind == "vous":
        return '<span class="chip chip-v">Avantage pour vous</span>'
    if kind == "lui":
        return '<span class="chip chip-l">Avantage pour lui</span>'
    return '<span class="chip">Équivalent</span>'

def carte(c):
    diffs = "".join(f'<div class="dl"><span class="dk">{e(k)}</span><span class="dv">{e(v)}</span>{chip(t)}</div>' for k, v, t in c["diffs"])
    if not c["diffs"]:
        diffs = '<div class="dl"><span class="dv">Équivalente à votre maison sur tous les critères.</span>' + chip("eq") + "</div>"
    eqline = f'<div class="eq">Équivalent sur : {e(c["eq"])}.</div>' if c["diffs"] else ""
    return f'''<div class="carte"><div class="cph" style="background-image:url(assets/{c["photo"]})"></div>
<div class="cbody"><div class="ck">Concurrent {c["n"]}</div><div class="clib">{e(c["lib"])}</div>
<div class="cprix"><div><div class="pk">Prix affiché</div><div class="pv">{c["prix"]}</div><div class="pm">{c["m2"]}</div></div>
<div><div class="pk">En vente depuis</div><div class="pv">{c["jours"]} jours</div></div></div>
<div class="ck2">Face à votre maison</div>{diffs}
{eqline}</div></div>'''

def frise():
    W, H, L, R, T, B = 640, 190, 30, 20, 22, 30
    x0, x1 = 2021.0, 2026.0
    pmin, pmax = 500_000, 1_150_000
    def X(a, m):
        return L + ((a + (m - 0.5) / 12) - x0) / (x1 - x0) * (W - L - R)
    def Y(p):
        return T + (1 - (p - pmin) / (pmax - pmin)) * (H - T - B)
    out = [f'<svg viewBox="0 0 {W} {H}" class="frise">']
    base = H - B
    out.append(f'<line x1="{L}" y1="{base}" x2="{W-R}" y2="{base}" stroke="#9aa7b1" stroke-width="1"/>')
    for a in range(2021, 2027):
        x = X(a, 0.5)
        out.append(f'<line x1="{x}" y1="{base}" x2="{x}" y2="{base+5}" stroke="#9aa7b1"/><text x="{x}" y="{base+18}" class="ax">{a}</text>')
    chosen = sorted([v for v in VENTES if v[7]], key=lambda v: (v[0], v[1]), reverse=True)
    idx = {id(v): i + 1 for i, v in enumerate(chosen)}
    for v in VENTES:
        if not v[7]:
            x, y = X(v[0], v[1]), Y(v[6])
            out.append(f'<line x1="{x}" y1="{y}" x2="{x}" y2="{base}" stroke="#d5dbe0" stroke-width="1"/><circle cx="{x}" cy="{y}" r="4" fill="#fff" stroke="#9aa7b1" stroke-width="1.5"/>')
    for v in VENTES:
        if v[7]:
            x, y = X(v[0], v[1]), Y(v[6])
            out.append(f'<line x1="{x}" y1="{y}" x2="{x}" y2="{base}" stroke="{BRAND}" stroke-width="1.2"/><circle cx="{x}" cy="{y}" r="8" fill="{BRAND}"/><text x="{x}" y="{y+3.6}" class="num">{idx[id(v)]}</text>')
    lo = min(VENTES, key=lambda v: v[6]); hi = max(VENTES, key=lambda v: v[6])
    out.append(f'<text x="{X(lo[0], lo[1])-8}" y="{Y(lo[6])-6}" class="lbl" text-anchor="end">{eur(lo[6]//1000)[:-2]} k€</text>'.replace(" ", " "))
    out.append(f'<text x="{X(hi[0], hi[1])}" y="{Y(hi[6])-9}" class="lbl" text-anchor="middle">{eur(hi[6]//1000)[:-2]} k€</text>'.replace(" ", " "))
    out.append("</svg>")
    return "".join(out), chosen

# ---------- pages ----------
pages = []

# 1. Couverture
pages.append(f'''<section class="page cover">
<div class="cv-photo" style="background-image:url(assets/maison-01.jpg)">
<div class="cv-logo"><img src="assets/logo-horizon-clair.svg" alt=""></div></div>
<div class="cv-bottom">
<div class="cv-k">Étude de marché</div>
<h1 class="cv-t">Votre maison à Vence<br>face au marché</h1>
<div class="cv-s">Maison · 5 pièces · 135 m² · 900 m² de terrain · Les Collines</div>
<div class="cv-row"><div><div class="cv-sk">Préparée pour</div><div class="cv-sv">Mme Garcia</div></div>
<div class="cv-adv"><div class="ini big">{ADV_INIT}</div><div><div class="cv-an">par {ADV}, Agence Horizon Côte d'Azur, le {DATE}</div>
<div class="cv-ac">06 39 98 00 01 · claire.dumas@example.com</div></div></div></div>
</div></section>''')

# 2. Ce que l'étude vous apprend
items = [
    ("1", "Votre prix est 4<sup>e</sup> sur 6 : trois maisons en vente sont moins chères que la vôtre.",
     "À 745 000 €, le prix retenu ensemble. Attention : ce sont elles que vos acheteurs visiteront d'abord.", 6, "o"),
    ("2", "Cinq maisons comme la vôtre sont en vente aujourd'hui, de 715 000 à 760 000 €.",
     "Deux ont un avantage sur la vôtre : la surface. Deux ont une exposition moins bonne.", 3, ""),
    ("3", "24 maisons de 101 à 169 m² se sont vendues autour de chez vous depuis 2021.",
     "Des prix signés chez le notaire. Votre conseillère en a retenu six, les plus proches de votre maison.", 5, ""),
    ("4", "Rien de relevé sur votre parcelle ; séisme et argiles à un niveau moyen.",
     "Deux permis de construire à moins de 300 m. Votre acheteur recevra l'état des risques avant de signer.", 7, ""),
]
li = "".join(f'''<div class="it{' it-o' if c=='o' else ''}"><div class="itn">{n}</div><div class="itx"><div class="itt">{t}</div><div class="its">{s}</div></div><div class="itp">page {p}</div></div>''' for n, t, s, p, c in items)
pages.append(f'''<section class="page">
<div class="band"><div class="band-txt"><h1>Quatre choses que cette étude<br>vous apprend sur votre maison</h1>
<p class="lead">Madame, voici ce que disent les annonces et les ventes autour de chez vous. Je les ai réunies pour vous, avant que vos acheteurs ne le fassent.</p>
<div class="kpis"><div><b>5</b><span>maisons comme la vôtre en vente aujourd'hui</span></div><div><b>24</b><span>maisons vendues autour de chez vous depuis 2021</span></div>
<div><b>4<sup>e</sup> sur 6</b><span>la place de votre prix, du moins cher au plus cher</span></div><div><b>4</b><span>sources publiques, toutes citées page 8</span></div></div></div></div>
<div class="body"><div class="items">{li}</div>
<div class="two"><div><h3>Comment cette étude est faite</h3><p>J'ai retenu les maisons en vente qui ressemblent le plus à la vôtre, puis réuni les ventes signées chez le notaire et les données publiques de votre adresse. Chaque chiffre a sa source et sa date.</p></div>
<div><h3>Et la valeur de votre maison ?</h3><p>Cette étude ne la calcule pas : elle montre le marché tel que vos acheteurs le voient. Le prix, nous l'avons retenu ensemble : 745 000 €.</p></div></div>
</div>{footer(2)}</section>''')

# 3-4. Concurrents
pages.append(f'''<section class="page">
{band("01", "Cinq maisons comme la vôtre<br>sont en vente aujourd'hui", "De 715 000 à 760 000 €. Ce sont elles que vos acheteurs visitent aussi : voici chacune, face à votre maison.")}
<div class="body">{carte(CONCURRENTS[0])}{carte(CONCURRENTS[1])}{carte(CONCURRENTS[2])}</div>{footer(3)}</section>''')
pages.append(f'''<section class="page"><div class="body top">{carte(CONCURRENTS[3])}{carte(CONCURRENTS[4])}
{avis("Vos acheteurs ne verront pas votre maison seule : ils la compareront à ces cinq-là. Deux sont plus grandes ; la vôtre a pour elle son exposition plein sud. C'est ce que l'annonce doit montrer.")}
{source("Annonces relevées le 19 novembre 2026. Prix affichés, pas des prix de vente. Surfaces et caractéristiques telles qu'annoncées, à vérifier.")}
</div>{footer(4)}</section>''')

# 5. Ventes réelles
svg, chosen = frise()
rows = "".join(f'<tr><td class="tn"><span>{i}</span></td><td>{MOIS[v[1]-1]} {v[0]}</td><td>{e(v[2])}</td><td class="r">{v[3]}</td><td class="r">{v[4]} m²</td><td class="r">{v[5]} m</td><td class="r b">{eur(v[6])}</td></tr>' for i, v in enumerate(chosen, 1))
pages.append(f'''<section class="page">
{band("02", "24 maisons comme la vôtre<br>se sont vendues autour de chez vous", "Depuis 2021, à moins de 250 m, de 101 à 169 m². Des prix signés chez le notaire, de 537 000 à 1 116 000 €.")}
<div class="body">{svg}
<p class="leg"><span class="dot-b"></span> les 6 ventes retenues par votre conseillère, numérotées comme le tableau &nbsp; <span class="dot-g"></span> les 18 autres ventes</p>
<h3>Les six ventes les plus proches de votre maison</h3>
<table class="tab"><thead><tr><th></th><th>Vendue en</th><th>Rue</th><th class="r">Pièces</th><th class="r">Surface</th><th class="r">À environ</th><th class="r">Prix</th></tr></thead><tbody>{rows}</tbody></table>
<h3>Comment lire ces chiffres</h3>
<ol class="lire"><li>Ce sont des prix de vente réels, pas des prix d'annonce.</li><li>Une vente ancienne s'est signée aux prix de son année : le marché a bougé depuis.</li><li>Les ventes des derniers mois ne sont pas encore toutes publiées : elles sont connues jusqu'au 30 juin 2026.</li></ol>
{avis("Ces six maisons ressemblent à la vôtre : 5 ou 6 pièces, de 125 à 139 m². Nous les regardons ensemble, une par une : surface, terrain, état, date de la vente.")}
{source("Source : DVF (DGFiP), ventes de logements anciens, données du 7 octobre 2026. Aucun nom de vendeur ni d'acheteur.")}
</div>{footer(5)}</section>''')

# 6. Où se place votre prix
seg = "".join(f'<div class="seg seg-{t}{" seg-me" if me else ""}"></div>' for _, _, _, _, t, me in CLASSEMENT)
lines = "".join(f'''<div class="cl{' cl-me' if me else ''}"><div class="cln cln-{t}">{n}</div><div class="cll"><div>{e(lab) if not me else '<b>VOTRE MAISON</b> · 5 p. · 135 m² · Vence, Les Collines'}</div><div class="cls">{e(sub)}</div></div><div class="clp">{p}</div></div>''' for n, lab, sub, p, t, me in CLASSEMENT)
pages.append(f'''<section class="page">
{band("03", "À 745 000 €, trois maisons en vente<br>sont moins chères que la vôtre", "Votre prix, face aux cinq maisons en vente, du moins cher au plus cher.")}
<div class="body"><div class="verdict"><div class="vi">!</div><div><div class="vt">Attention : vous êtes 4<sup>e</sup> sur 6</div><div class="vs">Le premier tiers ne pose pas de problème, le deuxième demande votre attention, le dernier est un danger.</div></div></div>
<div class="segs">{seg}</div>
<div class="clh"><span>Classement, du moins cher au plus cher</span><span>Prix affiché</span></div>{lines}
<p class="legende"><span class="lg lg-g"></span><span>1<sup>er</sup> tiers : pas de problème</span><span class="lg lg-o"></span><span>2<sup>e</sup> tiers : attention</span><span class="lg lg-r"></span><span>dernier tiers : danger</span></p>
{avis("Un acheteur commence souvent par les moins chères. Ce qui distingue votre maison doit se voir dès l'annonce : son exposition plein sud et ses 900 m² de terrain.")}
{source("Prix affichés le 19 novembre 2026. Votre maison au prix retenu ensemble. À égalité de prix, votre maison prend le meilleur rang.")}
</div>{footer(6)}</section>''')

# 7. Ce que votre acheteur demandera
rings = f'''<svg viewBox="0 0 120 120" class="rings"><circle cx="60" cy="60" r="56" fill="#fff" stroke="{BRAND}" stroke-width="1.2" stroke-dasharray="3 3"/><circle cx="60" cy="60" r="26" fill="#fff" stroke="{BRAND}" stroke-width="1.2"/><circle cx="60" cy="60" r="7" fill="{BRAND}"/><text x="60" y="44" class="rt">0 à 40 m : rien</text><text x="60" y="16" class="rt">40 à 300 m</text><text x="60" y="104" class="rt">3 éléments</text></svg>'''
pages.append(f'''<section class="page">
{band("04", "Ce que votre acheteur demandera :<br>rien de relevé sur votre parcelle", "Le plan d'urbanisme, ce qui se construit autour, les risques. Votre acheteur les recevra avant de signer : les voici, tels que les données publiques les donnent.")}
<div class="body"><div class="grid2">
<div class="tile"><div class="tk">L'urbanisme</div><div class="tv">Rien de relevé sur votre parcelle, ni à moins de 40 m.</div><div class="ts">Entre 40 et 300 m : 3 emplacements réservés pour une voie, le plus proche à 153 m.</div><div class="tsrc">Géoportail de l'urbanisme (IGN)</div></div>
<div class="tile"><div class="tk">Ce qui se construit autour</div><div class="tv">2 permis de construire à moins de 300 m, depuis 2022.</div><div class="ts">Rue des Oliviers · 1 logement, 62 m², autorisé en mars 2024 · à 128 m<br>Chemin du Val Fleuri · 2 logements, 124 m², terminé · à 234 m</div><div class="tsrc">Sitadel (SDES)</div></div>
</div>
<div class="tile risks"><div class="tk">Les risques</div><div class="rgrid">
<div><b>Séisme</b><span>zone 4 sur 5, moyenne · la commune</span></div><div><b>Argiles</b><span>exposition moyenne, sur 3 niveaux · votre adresse</span></div>
<div><b>Radon</b><span>catégorie 1 sur 3, faible · la commune</span></div><div><b>Inondation</b><span>commune d'un territoire à risque important (Nice Cannes Mandelieu)</span></div>
<div><b>Catastrophes naturelles</b><span>2 reconnues, la dernière le 31 mars 2023 · la commune</span></div><div><b>Habitants</b><span>1 120 à moins de 300 m · 2,2 personnes par ménage</span></div></div>
<div class="tsrc">Géorisques (ministère de la Transition écologique) · Insee. Ce n'est pas l'état des risques officiel, à produire pour la vente.</div></div>
<h3>Comment en parler à un acheteur</h3>
<ol class="lire"><li><b>Le dire en premier.</b> Un risque annoncé par le vendeur rassure ; découvert chez le notaire, il fait douter de tout le reste.</li><li><b>Montrer ce qui a été vécu.</b> Sinistres déclarés ou non, travaux faits : les faits comptent plus que la carte.</li><li><b>Préparer les papiers.</b> L'état des risques, les attestations d'assurance et, s'il y en a, les factures de travaux.</li></ol>
<div class="vivre"><img src="assets/qr-vivre-ici.svg" alt=""><div><div class="vt2">Vivre ici : le quartier, les écoles, les commerces</div><div class="vs2">Scannez pour découvrir le quartier, ou tapez app.myacademia.ai/l/… · lien valable jusqu'au 19 décembre 2026</div></div></div>
{avis("Rien de grand ne se construit à côté de chez vous : c'est une question qu'un acheteur pose souvent, et nous avons la réponse, permis à l'appui.")}
</div>{footer(7)}</section>''')

# 8. La suite
pages.append(f'''<section class="page">
<div class="band"><div class="band-txt"><h1>La suite tient en trois étapes</h1>
<div class="steps"><div><b>1</b><h4>Aujourd'hui</h4><p>Nous relisons cette étude ensemble. Vous me dites ce que les annonces ne disent pas.</p></div>
<div><b>2</b><h4>La mise en vente</h4><p>Annonce, photos, diagnostics : votre maison arrive sur le marché prête à être comparée.</p></div>
<div><b>3</b><h4>Chaque mois</h4><p>Un point marché : ce qui a baissé, ce qui s'est vendu, où en est votre prix.</p></div></div></div></div>
<div class="body"><div class="two2"><div><h3>Les papiers à réunir</h3>
<ul class="check"><li>Le titre de propriété</li><li>Le dernier avis de taxe foncière</li><li>Les diagnostics déjà réalisés</li><li>Les plans, s'ils existent</li><li>Les factures des travaux récents</li><li>L'attestation d'assainissement</li><li>Tout sinistre déclaré à l'assurance</li></ul></div>
<div><h3>Vos questions pour notre prochain échange</h3><div class="lines"><i></i><i></i><i></i><i></i><i></i><i></i></div></div></div>
<div class="advcard"><div class="ini big">{ADV_INIT}</div><div><div class="ak">Votre conseillère</div><div class="an">{ADV}</div><div class="ac">06 39 98 00 01 · claire.dumas@example.com</div></div><img src="assets/qr-vcard.svg" alt=""></div>
<h3>Ce que cette étude est, et ce qu'elle n'est pas</h3>
<p class="small">Elle compare votre maison aux maisons en vente le {DATE} et aux ventes publiées autour de chez vous. Les prix cités sont ceux des annonces, pas des prix de vente ; surfaces et caractéristiques telles qu'annoncées, à vérifier. Elle ne donne pas la valeur de votre maison : le prix, nous le fixons ensemble. Aucun nom de vendeur ni d'acheteur n'est cité.</p>
<table class="srcs"><tr><td>Les biens en vente</td><td>Annonces des portails, relevées par votre conseillère le {DATE}</td></tr><tr><td>Les ventes</td><td>DVF, direction générale des finances publiques, connues jusqu'au 30 juin 2026</td></tr>
<tr><td>Urbanisme et permis</td><td>Géoportail de l'urbanisme (IGN) · Sitadel (SDES)</td></tr><tr><td>Risques et habitants</td><td>Géorisques · Insee</td></tr></table>
<p class="mentions">Agence Horizon Côte d'Azur · 70 rue du Bonheur, 06140 Vence · Carte professionnelle CPI 0000 0000 000 000 000 délivrée par CCI Nice Côte d'Azur · Ne peut recevoir aucun fonds</p>
</div>{footer(8)}</section>''')

CSS = open("style.css").read()
doc = f'''<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Étude de marché · Maquette M163</title><style>{CSS}</style></head><body>{''.join(pages)}</body></html>'''
import re as _re
def _nb(t):
    for _ in range(2):
        t = _re.sub(r"(\d) (\d{3})", "\\1\u202f\\2", t)
    return _re.sub(r"(\d) (€|m²|m\b|jours|k€|%)", "\\1\u00a0\\2", t)
_head, _body = doc.split("<body>", 1)
doc = _head + "<body>" + _re.sub(r">([^<]+)<", lambda m: ">" + _nb(m.group(1)) + "<", _body)
open("etude.html", "w").write(doc)
print("ok", len(pages), "pages")
