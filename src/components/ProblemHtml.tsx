// Renders a question prompt or answer choice as real HTML instead of
// escaped text — matching the original app, which set these directly via
// `.innerHTML`. Some rows in the question bank format a problem with
// actual markup (tables, <sup>/<sub>, etc.) or embed a diagram straight
// into the text as an <img> tag; escaping it would show the raw tags
// instead of rendering them. This is trusted content from the Supabase
// question table you curate, not anything a visitor submits — the same
// trust boundary the original app used.

export function ProblemHtml({ html, as: Tag = "div", className }: { html: string; as?: "div" | "span" | "h2"; className?: string }) {
  return <Tag className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
