"""Build a static hosting ZIP and a standalone offline HTML copy. No dependencies."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import re
import json
import base64

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT.parent / 'governor-delivery'
OUTPUT.mkdir(exist_ok=True)
PUBLIC = ['construction-hero.webp', 'index.html', 'style.css', 'app.js', 'core.js', 'cloud.js', 'migration.js', 'profile.js', 'multi-user.sql', 'sw.js', 'icon.svg', 'icon-192.png', 'icon-512.png', 'manifest.webmanifest', 'docs/guide.html', 'docs/cloud-setup.html', 'connect.html', 'connect.js', 'setup.sql', 'update.html']
NAMES = {'core.js':'GovernorCore', 'migration.js':'GovernorMigration', 'cloud.js':'GovernorCloud', 'profile.js':'GovernorProfile'}

def inline_module(file):
    code = (ROOT / file).read_text()
    def resolve(match):
        names, source = match.groups()
        return f'const {{{names}}} = {NAMES[source.split("?")[0]]};'
    code = re.sub(r"^import\s*\{([^}]+)\}\s*from\s*'\./([^']+)';\s*$", resolve, code, flags=re.M)
    exports = re.findall(r'^export\s+(?:const|function|class)\s+(\w+)', code, flags=re.M)
    code = re.sub(r'^export\s+', '', code, flags=re.M)
    if file == 'app.js': return f'(() => {{\n{code}\n}})();'
    return f'const {NAMES[file]} = (() => {{\n{code}\nreturn {{{", ".join(exports)}}};\n}})();'

bundle = '\n'.join(inline_module(file) for file in ['core.js','migration.js','profile.js','cloud.js','app.js'])
html = (ROOT/'index.html').read_text()
html = html.replace('<html lang="en">', '<html lang="en" data-portable="true">')
css=(ROOT/'style.css').read_text().replace('./construction-hero.webp?v=20261009-r3','data:image/webp;base64,'+base64.b64encode((ROOT/'construction-hero.webp').read_bytes()).decode())
html = html.replace('<link rel="stylesheet" href="./style.css?v=20261009-r3">', f'<style>{css}</style>')
html = html.replace('<script type="module" src="./app.js?v=20261009-r3"></script>', '<script type="module">'+bundle.replace('</script', '<\\/script')+'</script>')
html = re.sub(r'\s*<link rel="(?:manifest|apple-touch-icon|icon)"[^>]+>', '', html)
(OUTPUT/'governor-offline.html').write_text(html)
start = """<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>The Governor — Start here</title><style>body{font:17px Arial;line-height:1.8;max-width:700px;padding:35px;margin:auto;background:#0d1011;color:#eee7da}h1{font-size:36px;color:#efc16d}a{color:#efc16d}.box{background:#252118;padding:20px;border-radius:12px}</style><h1>Your Governor is saved.</h1><div class="box"><strong>Your everyday app:</strong><p><a href="https://ahmadyasser3030.github.io/The-Governer/">Open The Governor</a></p><p>Use this same link on your phone and laptop. <a href="https://ahmadyasser3030.github.io/The-Governer/update.html">Open the safe update link</a> if an older design still appears. Existing connected browsers keep their sign-in and data.</p></div><p>Today: one next action. Plans: goals, calendar and progress. Library: notes, books and ideas. No paid software or AI service is required.</p><h2>Your recovery copy</h2><p><a href="governor-offline.html">governor-offline.html</a> contains the app files and image for emergency laptop use. Its browser storage is separate from the website. Import your private JSON backup to recover records; this folder does not include your personal data.</p><p>Before a long absence, use Settings → Export backup and keep two private copies. Free cloud projects can pause when unused. Your locally installed app remains usable offline after an online visit; first sign-in and cloud sync need internet.</p><p><a href="docs/guide.html">Two-minute user guide</a></p></html>"""
(OUTPUT/'START-HERE.html').write_text(start)
with ZipFile(OUTPUT/'governor-site.zip','w',ZIP_DEFLATED) as z:
    for file in PUBLIC: z.write(ROOT/file,file)
with ZipFile(OUTPUT/'governor-complete.zip','w',ZIP_DEFLATED) as z:
    for file in PUBLIC: z.write(ROOT/file,file)
    for file in ['README.md','docs/audit.md','docs/data-format.md','docs/deployment.md','docs/free-tier.md','docs/validation.md']: z.write(ROOT/file,file)
    for file in ['START-HERE.html','governor-offline.html','governor-site.zip']: z.write(OUTPUT/file,file)
print(json.dumps({'output':str(OUTPUT),'hosting_files':len(PUBLIC),'hosting_bytes':sum((ROOT/f).stat().st_size for f in PUBLIC),'offline_bytes':len(html.encode()),'complete_zip_bytes':(OUTPUT/'governor-complete.zip').stat().st_size}))
