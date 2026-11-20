import sys, pathlib
from playwright.sync_api import sync_playwright

here = pathlib.Path(__file__).parent.resolve()
src = sys.argv[1] if len(sys.argv) > 1 else "etude.html"
out = sys.argv[2] if len(sys.argv) > 2 else "etude.pdf"
with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/google-chrome")
    pg = b.new_page(viewport={"width": 794, "height": 1123})
    pg.goto((here / src).as_uri())
    pg.wait_for_timeout(600)
    if out.endswith(".pdf"):
        pg.pdf(path=str(here / out), format="A4", print_background=True, prefer_css_page_size=True)
        # contrôle : contenu qui dépasse d'une page
        over = pg.evaluate("""() => [...document.querySelectorAll('.page')].map((p,i)=>{
          const r=p.getBoundingClientRect(); const foot=p.querySelector('.foot');
          const lim = foot? foot.getBoundingClientRect().top : r.bottom;
          let m=0; p.querySelectorAll('.body > *, .band').forEach(c=>{m=Math.max(m,c.getBoundingClientRect().bottom)});
          return [i+1, Math.round(lim-m)] })""")
        print("marge sous le contenu (px) :", over)
    else:
        pg.screenshot(path=str(here / out), full_page=True)
    b.close()
