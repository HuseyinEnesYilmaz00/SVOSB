import sanitizeHtml from 'sanitize-html'

// Preserve document text, lists and tables, while preventing executable markup
// and remote resources from reaching the browser or DOCX converter.
export function sanitizeAssignment(html: string) {
  return sanitizeHtml(html, {
    allowedTags: ['p', 'br', 'hr', 'strong', 'b', 'em', 'i', 'u', 's', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'a', 'sup', 'sub'],
    allowedAttributes: { a: ['href'], th: ['colspan', 'rowspan'], td: ['colspan', 'rowspan'] },
    allowedSchemes: ['https', 'http', 'mailto'],
    allowProtocolRelative: false,
  })
}
