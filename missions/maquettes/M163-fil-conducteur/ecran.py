"""Maquette M163 : l'écran du conseiller qui coche les ventes, sur ordinateur, tablette et téléphone."""
import importlib.util, html
spec = importlib.util.spec_from_file_location("b", "build.py")
src = open("build.py").read().split("# ---------- pages ----------")[0]
ns = {}
exec(src, ns)
VENTES, MOIS, eur = ns["VENTES"], ns["MOIS"], ns["eur"]

def rows(compact):
    out = []
    for v in sorted(VENTES, key=lambda v: (not v[7], abs(v[4]-135) + 10*abs(v[3]-5))):
        on = v[7]
        box = f'<span class="cb{" on" if on else ""}">{"✓" if on else ""}</span>'
        if compact:
            out.append(f'<label class="r{" sel" if on else ""}">{box}<span class="rc"><b>{eur(v[6])}</b> · {MOIS[v[1]-1]} {v[0]}<br><small>{html.escape(v[2])} · {v[3]} p. · {v[4]} m² · {v[5]} m</small></span></label>')
        else:
            out.append(f'<label class="r{" sel" if on else ""}">{box}<span class="d">{MOIS[v[1]-1]} {v[0]}</span><span class="s">{html.escape(v[2])}</span><span class="n">{v[3]} p.</span><span class="n">{v[4]} m²</span><span class="n">{v[5]} m</span><span class="p">{eur(v[6])}</span></label>')
    return "".join(out)

def panel(compact, width):
    return f'''<div class="frame" style="width:{width}px"><div class="cap">{ {1280:"Ordinateur · 1280 px",1024:"Tablette · 1024 px",390:"Téléphone · 390 px"}[width] }</div>
<div class="scr"><div class="bar">Avant le rendez-vous · Mme Garcia</div><section class="card">
<h2>Ce que verra le vendeur : le quartier</h2>
<p class="hint">Rien n'est montré par défaut : cochez bloc par bloc. Chaque bloc coché devient un écran du Live et une page de l'Étude de marché et de la synthèse.</p>
<label class="blk"><span class="cb">✓</span><span><b>Urbanisme</b><br><small>Rien de relevé sur votre parcelle, ni à moins de 40 m.</small></span></label>
<label class="blk on"><span class="cb on">✓</span><span><b>Ventes réelles autour du bien</b><br><small>24 maisons de 101 à 169 m² vendues autour de chez vous depuis 2021</small></span></label>
<div class="sales"><div class="sh"><b>Les ventes que verra le vendeur : 6 sur 24</b>
<span class="links"><a>Les 6 plus proches de votre bien</a> · <a>Tout décocher</a></span></div>
<p class="hint">Rangées de la plus proche de votre bien (surface, pièces) à la plus lointaine ; les 6 premières sont cochées d'avance, décochez ou cochez librement, sans limite. Elles sont numérotées sur la frise et listées dans le Live, l'Étude et la synthèse ; les autres restent des points sur la frise.</p>
<div class="list{' compact' if compact else ''}">{rows(compact)}</div></div>
<p class="count">2 écrans ajoutés au Live · environ 3 minutes de plus</p>
<button class="btn">Enregistrer le choix</button></section></div></div>'''

CSS = """
@font-face{font-family:Montserrat;font-weight:100 900;src:url(assets/montserrat-latin.woff2)}
*{box-sizing:border-box;margin:0;padding:0}body{font-family:Montserrat,sans-serif;background:#e9edf0;padding:24px;display:flex;gap:28px;align-items:flex-start;color:#1b2730;font-size:14px}
.frame{flex:none}.cap{font-weight:700;margin-bottom:8px;color:#013a58}
.scr{background:#f5f7f9;border:1px solid #c9d2d9;border-radius:12px;overflow:hidden}
.bar{background:#fff;border-bottom:1px solid #dbe2e7;padding:12px 18px;font-weight:600;color:#013a58}
.card{background:#fff;margin:18px;border:1px solid #dbe2e7;border-radius:14px;padding:20px;display:flex;flex-direction:column;gap:12px}
h2{font-size:17px;color:#013a58}.hint{font-size:12.5px;color:#5d6b75}
.blk{display:flex;gap:12px;border:1px solid #dbe2e7;border-radius:12px;padding:12px 14px}.blk.on{border-color:#7fa3b8;background:#f1f6f9}
small{color:#5d6b75;font-size:12px}
.cb{width:18px;height:18px;border:1.5px solid #8a98a3;border-radius:4px;display:inline-flex;align-items:center;justify-content:center;font-size:12px;color:#fff;flex:none;margin-top:2px}
.cb.on,.blk .cb{background:#013a58;border-color:#013a58}
.sales{border-left:3px solid #013a58;margin-left:8px;padding-left:14px;display:flex;flex-direction:column;gap:8px}
.sh{display:flex;justify-content:space-between;flex-wrap:wrap;gap:6px;align-items:baseline}.links a{color:#00527a;text-decoration:underline;font-size:12.5px}
.list{max-height:330px;overflow:auto;border:1px solid #e3e8ec;border-radius:10px}
.r{display:flex;gap:10px;align-items:center;padding:7px 10px;border-bottom:1px solid #eef1f3;font-size:12.5px}
.r.sel{background:#f1f6f9}.r .d{width:110px}.r .s{flex:1}.r .n{width:56px;text-align:right;color:#4b5964}.r .p{width:100px;text-align:right;font-weight:700}
.compact .r{align-items:flex-start}.rc{line-height:1.35}
.count{font-weight:600;color:#013a58;font-size:13px}
.btn{align-self:flex-start;border:1.5px solid #013a58;color:#013a58;background:#fff;border-radius:10px;padding:9px 16px;font-weight:600;font-family:inherit}
"""
page = f'<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>{CSS}</style></head><body>{panel(False,1280)}{panel(False,1024)}{panel(True,390)}</body></html>'
import re
page = re.sub(r">([^<]+)<", lambda m: ">" + re.sub(r"(\d) (\d{3})", "\\1\u202f\\2", m.group(1)) + "<", page)
open("ecran.html", "w").write(page)
print("ok")
