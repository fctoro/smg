import codecs

file_path = 'C:/Users/RK_Piton/Documents/smg/src/components/club/forms/PlayerForm.tsx'
content = codecs.open(file_path, 'r', 'utf-8').read()

target1 = '<div className="sm:col-span-2 md:col-span-3 mt-2">'
replacement1 = '<div className="sm:col-span-2 lg:col-span-3 mt-2">'
content = content.replace(target1, replacement1)

target2 = '<div className="sm:col-span-2 md:col-span-3 pt-2">'
replacement2 = '<div className="sm:col-span-2 lg:col-span-3 pt-2">'
content = content.replace(target2, replacement2)

codecs.open(file_path, 'w', 'utf-8').write(content)
