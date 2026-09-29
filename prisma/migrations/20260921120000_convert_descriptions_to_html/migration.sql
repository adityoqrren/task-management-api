-- Migrate existing plain-text Project and Task descriptions to HTML.
--
-- The frontend editor (Tiptap: StarterKit + Link + Underline) expects an HTML
-- string. Existing rows contain plain text, so each description is escaped and
-- wrapped in <p> paragraphs, with blank lines becoming paragraph breaks and
-- single newlines becoming <br>.
--
-- Safety:
--   * NULL descriptions stay NULL.
--   * Empty / whitespace-only descriptions are left untouched.
--   * Values that already start with an HTML tag are skipped, so the migration
--     is safe to run again and never double-wraps existing HTML.

-- Projects
WITH source AS (
  SELECT
    id,
    regexp_replace(
      replace(replace(replace(description, '&', '&amp;'), '<', '&lt;'), '>', '&gt;'),
      E'\r\n',
      E'\n',
      'g'
    ) AS escaped
  FROM "Projects"
  WHERE description IS NOT NULL
    AND btrim(description) <> ''
    AND description !~ '^[[:space:]]*</?[a-zA-Z]'
)
UPDATE "Projects" p
SET description = '<p>' ||
  regexp_replace(
    regexp_replace(source.escaped, E'\n{2,}', '</p><p>', 'g'),
    E'\n',
    '<br>',
    'g'
  ) || '</p>'
FROM source
WHERE p.id = source.id;

-- Tasks
WITH source AS (
  SELECT
    id,
    regexp_replace(
      replace(replace(replace(description, '&', '&amp;'), '<', '&lt;'), '>', '&gt;'),
      E'\r\n',
      E'\n',
      'g'
    ) AS escaped
  FROM "Tasks"
  WHERE description IS NOT NULL
    AND btrim(description) <> ''
    AND description !~ '^[[:space:]]*</?[a-zA-Z]'
)
UPDATE "Tasks" t
SET description = '<p>' ||
  regexp_replace(
    regexp_replace(source.escaped, E'\n{2,}', '</p><p>', 'g'),
    E'\n',
    '<br>',
    'g'
  ) || '</p>'
FROM source
WHERE t.id = source.id;
