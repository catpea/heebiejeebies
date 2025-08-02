export default function quoteAndBracketStrategy(context, strings, values) {
  // State tracking object
  const state = {
    inSingleQuote: false,
    inDoubleQuote: false,
    inTag: false,
    bracketDepth: 0,
    curlyBraceDepth: 0,
    squareBracketDepth: 0,
    tagDepth: 0,
    lastChar: '',
    position: 0
  };

  let result = '';

  // Helper function to check if character is escaped
  function isEscaped(str, pos) {
    let escapeCount = 0;
    let i = pos - 1;

    // Count consecutive backslashes before the character
    while (i >= 0 && str[i] === '\\') {
      escapeCount++;
      i--;
    }

    // Character is escaped if odd number of backslashes precede it
    return escapeCount % 2 === 1;
  }

  // Helper function to update quote states
  function updateQuoteState(char, pos, str) {
    if (char === '"' && !isEscaped(str, pos)) {
      if (!state.inSingleQuote) {
        state.inDoubleQuote = !state.inDoubleQuote;
      }
    } else if (char === "'" && !isEscaped(str, pos)) {
      if (!state.inDoubleQuote) {
        state.inSingleQuote = !state.inSingleQuote;
      }
    }
  }

  // Helper function to update bracket states
  function updateBracketState(char) {
    // Only track brackets when not in quotes
    if (!state.inSingleQuote && !state.inDoubleQuote) {
      switch (char) {
        case '(':
          state.bracketDepth++;
          break;
        case ')':
          state.bracketDepth = Math.max(0, state.bracketDepth - 1);
          break;
        case '{':
          state.curlyBraceDepth++;
          break;
        case '}':
          state.curlyBraceDepth = Math.max(0, state.curlyBraceDepth - 1);
          break;
        case '[':
          state.squareBracketDepth++;
          break;
        case ']':
          state.squareBracketDepth = Math.max(0, state.squareBracketDepth - 1);
          break;
      }
    }
  }

  // Helper function to update tag state
  function updateTagState(char) {
    // Only update tag state when not in quotes
    if (!state.inSingleQuote && !state.inDoubleQuote) {
      if (char === '<') {
        state.inTag = true;
        state.tagDepth++;
      } else if (char === '>') {
        state.inTag = false;
        // Keep track of nested tag depth for complex structures
        state.tagDepth = Math.max(0, state.tagDepth - 1);
        if (state.tagDepth > 0) {
          state.inTag = true; // Still in a nested tag context
        }
      }
    }
  }

  // Process character by character through all strings
  function processString(str) {
    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      const globalPos = state.position + i;

      // Update all state flags
      updateQuoteState(char, i, str);
      updateBracketState(char);
      updateTagState(char);

      state.lastChar = char;
    }

    state.position += str.length;
  }

  // Determine context based on current state
  function determineContext() {
    const inQuote = state.inSingleQuote || state.inDoubleQuote;

    // Priority order for context determination:

    // 1. If we're in quotes within a tag, it's an attribute value
    if (state.inTag && inQuote) {
      return {
        type: 'ATTR_VALUE',
        detail: {
          inTag: state.inTag,
          inQuote: inQuote,
          quoteType: state.inSingleQuote ? 'single' : 'double',
          bracketDepth: state.bracketDepth,
          curlyBraceDepth: state.curlyBraceDepth
        }
      };
    }

    // 2. If we're in a tag but not in quotes, it's an attribute name
    if (state.inTag && !inQuote) {
      return {
        type: 'ATTR_NAME',
        detail: {
          inTag: state.inTag,
          inQuote: false,
          bracketDepth: state.bracketDepth,
          curlyBraceDepth: state.curlyBraceDepth
        }
      };
    }

    // 3. If we're not in a tag, it's text content
    if (!state.inTag) {
      return {
        type: 'TEXT',
        detail: {
          inTag: false,
          inQuote: inQuote,
          bracketDepth: state.bracketDepth,
          curlyBraceDepth: state.curlyBraceDepth
        }
      };
    }

    // 4. Fallback to text
    return {
      type: 'TEXT',
      detail: {
        fallback: true,
        inTag: state.inTag,
        inQuote: inQuote
      }
    };
  }

  // Generate marker based on context
  function generateMarker(valueId, contextInfo) {
    switch (contextInfo.type) {
      case 'ATTR_VALUE':
        return `::${valueId}`;
      case 'ATTR_NAME':
        return `::${valueId}=""`;
      case 'TEXT':
      default:
        return `<!-- ::${valueId} -->`;
    }
  }

  // Main processing loop
  for (let i = 0; i < strings.length; i++) {
    const str = strings[i];

    // Process this string segment to update state
    processString(str);

    // Add the string to result
    result += str;

    // Handle interpolation if there's a value for this position
    if (i < values.length) {
      const value = values[i];
      const valueId = i;

      // Determine context based on current state
      const contextInfo = determineContext();

      // Store the value with rich context information
      context.set(valueId, {
        value: value,
        context: contextInfo,
        state: {
          inSingleQuote: state.inSingleQuote,
          inDoubleQuote: state.inDoubleQuote,
          inTag: state.inTag,
          bracketDepth: state.bracketDepth,
          curlyBraceDepth: state.curlyBraceDepth,
          tagDepth: state.tagDepth,
          position: state.position
        }
      });

      // Generate and add appropriate marker
      const marker = generateMarker(valueId, contextInfo);
      result += marker;
    }
  }

  return result;
}
