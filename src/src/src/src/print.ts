export function printHtml(html: string) {
  const w = window.open('', '_blank')
  if (!w) return
  w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>Devis</title></head><body>'+html+'</body></html>')
  w.document.close()
  w.focus()
  w.print()
}
