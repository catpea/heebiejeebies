export default function regexBasedStrategy(context, strings, values) {
  let result = '';

  // Regex patterns for context detection
  const patterns = {
    // Attribute value: = followed by quote, then non-quote chars until end
    ATTR_VALUE: /=\s*["'][^"']*$/,

    // Attribute name: whitespace followed by word chars (including hyphens) until end
    ATTR_NAME: /\s+[\w-]*$/,

    // Text content: > followed by non-< chars until end
    TEXT_AFTER_TAG: />[^<]*$/,

    // Additional patterns for better detection
    QUOTED_ATTR: /=\s*["'][^"']*$/,
    UNQUOTED_ATTR: /=\s*[^"'\s>]*$/,
    IN_TAG: /<[^>]*$/,
    COMMENT_START: /<!--[^>]*$/
  };

  // Helper function to detect context from string ending
  function detectContext(stringPart) {
    // Handle empty or whitespace-only strings
    if (!stringPart.trim()) {
      return 'TEXT';
    }

    // Remove any trailing whitespace for analysis but preserve it
    const trimmed = stringPart.trimEnd();

    // Check for attribute value context (quoted)
    if (patterns.QUOTED_ATTR.test(trimmed)) {
      return 'ATTR_VALUE';
    }

    // Check for unquoted attribute value
    if (patterns.UNQUOTED_ATTR.test(trimmed)) {
      return 'ATTR_VALUE';
    }

    // Check for attribute name context
    if (patterns.ATTR_NAME.test(trimmed)) {
      return 'ATTR_NAME';
    }

    // Check for text content after closing tag
    if (patterns.TEXT_AFTER_TAG.test(trimmed)) {
      return 'TEXT';
    }

    // Check if we're inside a tag (but not in attribute context)
    if (patterns.IN_TAG.test(trimmed)) {
      // If we're in a tag but no specific attribute context detected,
      // assume we're starting an attribute name
      return 'ATTR_NAME';
    }

    // Check for comment context
    if (patterns.COMMENT_START.test(trimmed)) {
      return 'COMMENT';
    }

    // Default to text context
    return 'TEXT';
  }

  // Helper function to handle escape sequences
  function hasUnescapedQuote(str) {
    let escaped = false;
    for (let i = str.length - 1; i >= 0; i--) {
      const char = str[i];
      if (char === '\\' && !escaped) {
        escaped = true;
      } else if ((char === '"' || char === "'") && !escaped) {
        return true;
      } else {
        escaped = false;
      }
    }
    return false;
  }

  // Helper function for defensive HTML handling
  function isValidContext(context, stringPart) {
    // Basic validation to catch malformed HTML
    if (context === 'ATTR_VALUE') {
      // Must have an = sign
      if (!/=/.test(stringPart)) {
        return false;
      }
    }

    if (context === 'ATTR_NAME') {
      // Should be in a tag context
      if (!/<[^>]*$/.test(stringPart)) {
        return false;
      }
    }

    return true;
  }

  // Process each string and interpolation
  for (let i = 0; i < strings.length; i++) {
    const str = strings[i];
    result += str;

    // Handle interpolation if there's a value for this position
    if (i < values.length) {
      const value = values[i];
      const valueId = i;

      // Store the value in context Map
      context.set(valueId, value);

      // Analyze the current string ending to determine context
      let detectedContext = detectContext(str);

      // Defensive validation - fallback if context seems wrong
      if (!isValidContext(detectedContext, str)) {
        detectedContext = 'TEXT';
      }

      // Generate appropriate marker based on detected context
      let marker;

      switch (detectedContext) {
        case 'ATTR_VALUE':
          marker = `::${valueId}`;
          break;

        case 'ATTR_NAME':
          marker = `::${valueId}=""`;
          break;

        case 'TEXT':
        case 'COMMENT':
        default:
          marker = `<!-- ::${valueId} -->`;
          break;
      }

      result += marker;
    }
  }

  return result;
}
