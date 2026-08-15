import codecs

file_path = 'C:/Users/RK_Piton/Documents/smg/src/components/club/forms/PlayerForm.tsx'
content = codecs.open(file_path, 'r', 'utf-8').read()

target = '          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">\r\n            <div className="sm:col-span-2 md:col-span-3">\r\n              <label className="mb-3 block text-xs font-medium text-gray-700 dark:text-gray-300">PIED DOMINANT *</label>'
if target not in content:
    target = target.replace('\r\n', '\n')

replacement = '''          <div className="sm:col-span-2 lg:col-span-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="mb-3 block text-xs font-medium text-gray-700 dark:text-gray-300">PIED DOMINANT *</label>'''

content = content.replace(target, replacement)
codecs.open(file_path, 'w', 'utf-8').write(content)
