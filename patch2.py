import codecs

file_path = 'C:/Users/RK_Piton/Documents/smg/src/app/(admin)/joueurs/page.tsx'
content = codecs.open(file_path, 'r', 'utf-8').read()

target = '          siteMessageId={searchParams.get("siteMessageId")}\r\n          commentIdentifie={searchParams.get("commentIdentifie")}'
if target not in content:
    target = target.replace('\r\n', '\n')

replacement = '''          siteMessageId={searchParams.get("siteMessageId")}
          commentIdentifie={searchParams.get("commentIdentifie")}
          piedDominant={searchParams.get("piedDominant")}
          clubActuel={searchParams.get("clubActuel")}'''

content = content.replace(target, replacement)
codecs.open(file_path, 'w', 'utf-8').write(content)
