/** Display spacing only: preserve API terms, book-title dots and source strings. */
export function InlineText({ children }: { readonly children: string }) {
  return children.replaceAll(' · ', '\u202f·\u202f');
}
