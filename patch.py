import codecs

file_path = 'C:/Users/RK_Piton/Documents/smg/src/app/(admin)/demandes/inscriptions/page.tsx'
content = codecs.open(file_path, 'r', 'utf-8').read()

target = '                        if (selectedMessage.metadata?.site_message_id) {\r\n                          queryParams.set("siteMessageId", selectedMessage.metadata.site_message_id);\r\n                        }'
if target not in content:
    target = target.replace('\r\n', '\n')

replacement = '''                        if (selectedMessage.metadata?.site_message_id) {
                          queryParams.set("siteMessageId", selectedMessage.metadata.site_message_id);
                        }
                        if (selectedMessage.metadata?.comment_identifie) {
                          queryParams.set("commentIdentifie", selectedMessage.metadata.comment_identifie);
                        }
                        if (selectedMessage.metadata?.pied_dominant) {
                          queryParams.set("piedDominant", selectedMessage.metadata.pied_dominant);
                        }
                        if (selectedMessage.metadata?.club_actuel) {
                          queryParams.set("clubActuel", selectedMessage.metadata.club_actuel);
                        }'''

content = content.replace(target, replacement)
codecs.open(file_path, 'w', 'utf-8').write(content)
