"""Build a static hosting ZIP and a standalone offline HTML copy. No dependencies."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import re
import json

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT.parent / 'governor-delivery'
OUTPUT.mkdir(exist_ok=True)
PUBLIC = ['index.html', 'style.css', 'app.js', 'core.js', 'cloud.js', 'migration.js', 'sw.js', 'icon.svg', 'icon-192.png', 'icon-512.png', 'manifest.webmanifest', 'docs/guide.html', 'docs/cloud-setup.html']
NAMES = {'core.js':'GovernorCore', 'migration.js':'GovernorMigration', 'cloud.js':'GovernorCloud'}

def inline_module(file):
    code = (ROOT / file).read_text()
    def resolve(match):
        names, source = match.groups()
        return f'const {{{names}}} = {NAMES[source]};'
    code = re.sub(r"^import\s*\{([^}]+)\}\s*from\s*'\./([^']+)';\s*$", resolve, code, flags=re.M)
    exports = re.findall(r'^export\s+(?:const|function|class)\s+(\w+)', code, flags=re.M)
    code = re.sub(r'^export\s+', '', code, flags=re.M)
    if file == 'app.js': return f'(() => {{\n{code}\n}})();'
    return f'const {NAMES[file]} = (() => {{\n{code}\nreturn {{{", ".join(exports)}}};\n}})();'

bundle = '\n'.join(inline_module(file) for file in ['core.js','migration.js','cloud.js','app.js'])
html = (ROOT/'index.html').read_text()
html = html.replace('<html lang="en">', '<html lang="en" data-portable="true">')
html = html.replace('<link rel="stylesheet" href="./style.css">', f'<style>{(ROOT/"style.css").read_text()}</style>')
html = html.replace('<script type="module" src="./app.js"></script>', '<script type="module">'+bundle.replace('</script', '<\\/script')+'</script>')
html = re.sub(r'\s*<link rel="(?:manifest|apple-touch-icon|icon)"[^>]+>', '', html)
(OUTPUT/'governor-offline.html').write_text(html)
start = '''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Start your Governor</title><style>body{font:17px Arial;line-height:1.8;max-width:700px;padding:35px;margin:auto;background:#f7f6f2;color:#2d352f}h1{font:36px Georgia}a{color:#385441}li{margin:12px 0}.box{background:#e9eee6;padding:20px;border-radius:12px}</style><h1>Your Governor is saved.</h1><p>A concrete daily plan, a weekly Compass, and a reference Vault. No paid software or AI service required.</p><div class="box"><strong>To try it on your laptop now:</strong><ol><li>Extract this ZIP into a folder.</li><li>Open <a href="governor-offline.html">governor-offline.html</a> in Chrome, Edge or Firefox.</li><li>Edit the starter actions to match your actual work. Export your data from Settings before changing versions or moving devices.</li></ol></div><p>This portable file saves in your browser on this device. It is not already connected to the cloud. Moving the HTML file or using another browser can create a separate storage area; transfer your JSON backup.</p><p>For a phone app icon and cloud sync, upload <strong>governor-site.zip</strong> to a free static host and connect your own free cloud account. <a href="docs/cloud-setup.html">The short setup guide explains it</a>. Your existing website has not been changed.</p><p><a href="docs/guide.html">Read the two-minute user guide</a></p><p>Before military service: keep this folder and a private exported JSON backup in two places. Free cloud services can pause when unused. The portable file needs no network for daily work.</p></html>'''
(OUTPUT/'START-HERE.html').write_text(start)
with ZipFile(OUTPUT/'governor-site.zip','w',ZIP_DEFLATED) as z:
    for file in PUBLIC: z.write(ROOT/file,file)
with ZipFile(OUTPUT/'governor-complete.zip','w',ZIP_DEFLATED) as z:
    for file in PUBLIC: z.write(ROOT/file,file)
    for file in ['setup.sql','README.md','docs/audit.md','docs/data-format.md','docs/deployment.md','docs/free-tier.md','docs/validation.md']: z.write(ROOT/file,file)
    for file in ['START-HERE.html','governor-offline.html','governor-site.zip']: z.write(OUTPUT/file,file)
print(json.dumps({'output':str(OUTPUT),'hosting_files':len(PUBLIC),'hosting_bytes':sum((ROOT/f).stat().st_size for f in PUBLIC),'offline_bytes':len(html.encode()),'complete_zip_bytes':(OUTPUT/'governor-complete.zip').stat().st_size}))
