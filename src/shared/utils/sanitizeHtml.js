import sanitizeHtml from 'sanitize-html';

/**
 * HTML elements produced by the frontend Tiptap editor
 * (StarterKit + Link with openOnClick:false + Underline).
 *
 * StarterKit maps to: p, br, strong, em, s, code, pre, blockquote,
 * h1-h6, ul, ol, li, hr. Link adds <a>, Underline adds <u>.
 */
const ALLOWED_TAGS = [
  'p',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'strike',
  'del',
  'code',
  'pre',
  'blockquote',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'ul',
  'ol',
  'li',
  'hr',
  'a',
];

/**
 * Only the attributes required by the supported editor features:
 * - <a> needs href (link), plus target/rel set by the Link extension.
 * - <code>/<pre> may carry a "language-*" class from syntax highlighting.
 */
const ALLOWED_ATTRIBUTES = {
  a: ['href', 'target', 'rel'],
  code: ['class'],
  pre: ['class'],
};

/**
 * Links are restricted to safe schemes only.
 */
const ALLOWED_SCHEMES = ['http', 'https', 'mailto'];

const SANITIZE_OPTIONS = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: ALLOWED_ATTRIBUTES,
  allowedSchemes: ALLOWED_SCHEMES,
  allowedSchemesByTag: {
    a: ALLOWED_SCHEMES,
  },
  allowProtocolRelative: false,
  disallowedTagsMode: 'discard',
};

/**
 * Sanitize a Project/Task description so that only editor-safe HTML survives.
 * Non-string, null and undefined values are returned untouched so optional
 * fields keep their existing semantics.
 *
 * @param {string|null|undefined} description
 * @returns {string|null|undefined} sanitized HTML (or the original value)
 */
export const sanitizeDescription = (description) => {
  if (typeof description !== 'string') return description;
  return sanitizeHtml(description, SANITIZE_OPTIONS);
};

export default sanitizeDescription;
