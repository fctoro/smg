import codecs

file_path = 'C:/Users/RK_Piton/Documents/smg/src/components/club/modals/PlayerEditModal.tsx'
content = codecs.open(file_path, 'r', 'utf-8').read()

target1 = '  commentIdentifie?: string | null;\r\n}'
if target1 not in content:
    target1 = target1.replace('\r\n', '\n')

replacement1 = '''  commentIdentifie?: string | null;
  piedDominant?: string | null;
  clubActuel?: string | null;
}'''
content = content.replace(target1, replacement1)

target2 = '  commentIdentifie,\r\n}) => {'
if target2 not in content:
    target2 = target2.replace('\r\n', '\n')

replacement2 = '''  commentIdentifie,
  piedDominant,
  clubActuel,
}) => {'''
content = content.replace(target2, replacement2)

target3 = '              ...(commentIdentifie ? { commentIdentifie } : {})\r\n            }}'
if target3 not in content:
    target3 = target3.replace('\r\n', '\n')

replacement3 = '''              ...(commentIdentifie ? { commentIdentifie } : {}),
              ...(piedDominant ? { piedDominant } : {}),
              ...(clubActuel ? { clubActuel } : {})
            }}'''
content = content.replace(target3, replacement3)

codecs.open(file_path, 'w', 'utf-8').write(content)
