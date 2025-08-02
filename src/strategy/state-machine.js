export default function stateMachineStrategy(context, strings, values) {
  // State machine states
  const STATES = {
    TEXT: 'TEXT',
    TAG_OPEN: 'TAG_OPEN',
    ATTR_NAME: 'ATTR_NAME',
    ATTR_VALUE: 'ATTR_VALUE',
    TAG_CLOSE: 'TAG_CLOSE'
  };

  let state = STATES.TEXT;
  let result = '';
  let inQuotes = false;
  let quoteChar = null; // Track which quote type we're in
  let tagDepth = 0;

  // Process each string segment and interpolation
  for (let i = 0; i < strings.length; i++) {
    const str = strings[i];

    // Process current string character by character to update state
    for (let j = 0; j < str.length; j++) {
      const char = str[j];
      const prevChar = j > 0 ? str[j - 1] : '';
      const nextChar = j < str.length - 1 ? str[j + 1] : '';

      // Handle quote transitions
      if ((char === '"' || char === "'") && prevChar !== '\\') {
        if (!inQuotes) {
          inQuotes = true;
          quoteChar = char;
        } else if (char === quoteChar) {
          inQuotes = false;
          quoteChar = null;
        }
      }

      // State transitions (only when not in quotes)
      if (!inQuotes) {
        switch (char) {
          case '<':
            if (nextChar === '/') {
              state = STATES.TAG_CLOSE;
            } else if (nextChar !== '!' && nextChar !== '?') {
              state = STATES.TAG_OPEN;
              tagDepth++;
            }
            break;

          case '>':
            if (state === STATES.TAG_CLOSE) {
              tagDepth--;
            }
            state = tagDepth > 0 ? STATES.TEXT : STATES.TEXT;
            break;

          case '=':
            if (state === STATES.ATTR_NAME || state === STATES.TAG_OPEN) {
              state = STATES.ATTR_VALUE;
            }
            break;

          case ' ':
          case '\t':
          case '\n':
          case '\r':
            if (state === STATES.TAG_OPEN) {
              state = STATES.ATTR_NAME;
            } else if (state === STATES.ATTR_VALUE && !inQuotes) {
              state = STATES.ATTR_NAME;
            }
            break;
        }
      }
    }

    // Add the current string segment
    result += str;

    // Handle interpolation if there's a value for this position
    if (i < values.length) {
      const value = values[i];
      const valueId = i;

      // Store the value in context with numeric key
      context.set(valueId, value);

      // Determine current context and generate appropriate marker
      let marker;

      // Special case: if we're in quotes, we're definitely in an attribute value
      if (inQuotes) {
        marker = `::${valueId}`;
      } else {
        switch (state) {
          case STATES.TEXT:
            marker = `<!-- ::${valueId} -->`;
            break;

          case STATES.ATTR_VALUE:
            marker = `::${valueId}`;
            break;

          case STATES.ATTR_NAME:
          case STATES.TAG_OPEN:
            marker = `::${valueId}=""`;
            break;

          case STATES.TAG_CLOSE:
            // Shouldn't happen in valid XML, treat as text
            marker = `<!-- ::${valueId} -->`;
            break;

          default:
            // Fallback to text context
            marker = `<!-- ::${valueId} -->`;
            break;
        }
      }

      result += marker;
    }
  }

  return result;
}
