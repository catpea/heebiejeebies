export default function tokenBasedStrategy(context, strings, values) {
  // Token types
  const TOKEN_TYPES = {
    TAG_OPEN: 'TAG_OPEN',
    TAG_CLOSE: 'TAG_CLOSE',
    ATTR_NAME: 'ATTR_NAME',
    ATTR_VALUE: 'ATTR_VALUE',
    TEXT: 'TEXT',
    COMMENT: 'COMMENT',
    PLACEHOLDER: 'PLACEHOLDER'
  };

  // First pass: Join strings with temporary placeholders
  function createTemplateWithPlaceholders(strings, values) {
    let template = '';
    for (let i = 0; i < strings.length; i++) {
      template += strings[i];
      if (i < values.length) {
        template += `__PLACEHOLDER_${i}__`;
      }
    }
    return template;
  }

  // Tokenizer function
  function tokenize(template) {
    const tokens = [];
    let pos = 0;

    while (pos < template.length) {
      const token = getNextToken(template, pos);
      if (token) {
        tokens.push(token);
        pos = token.end;
      } else {
        pos++;
      }
    }

    return tokens;
  }

  // Get next token from template
  function getNextToken(template, startPos) {
    let pos = startPos;

    // Skip whitespace at start
    while (pos < template.length && /\s/.test(template[pos])) {
      pos++;
    }

    if (pos >= template.length) return null;

    const char = template[pos];

    // Comment detection
    if (template.substr(pos, 4) === '<!--') {
      const endPos = template.indexOf('-->', pos + 4);
      if (endPos !== -1) {
        return {
          type: TOKEN_TYPES.COMMENT,
          value: template.substring(pos, endPos + 3),
          start: startPos,
          end: endPos + 3
        };
      }
    }

    // Placeholder detection
    if (template.substr(pos, 13) === '__PLACEHOLDER') {
      const match = template.substring(pos).match(/^__PLACEHOLDER_(\d+)__/);
      if (match) {
        return {
          type: TOKEN_TYPES.PLACEHOLDER,
          value: match[0],
          placeholderId: parseInt(match[1]),
          start: startPos,
          end: pos + match[0].length
        };
      }
    }

    // Tag opening
    if (char === '<') {
      return parseTag(template, startPos);
    }

    // Text content (everything else)
    return parseText(template, startPos);
  }

  // Parse tag tokens (opening and closing)
  function parseTag(template, startPos) {
    let pos = startPos + 1; // Skip '<'
    const isClosing = template[pos] === '/';

    if (isClosing) pos++; // Skip '/'

    // Find end of tag
    let tagEnd = template.indexOf('>', pos);
    if (tagEnd === -1) tagEnd = template.length;

    const tagContent = template.substring(startPos, tagEnd + 1);
    const isSelfClosing = template[tagEnd - 1] === '/';

    if (isClosing) {
      return {
        type: TOKEN_TYPES.TAG_CLOSE,
        value: tagContent,
        start: startPos,
        end: tagEnd + 1
      };
    }

    // For opening tags, we need to parse attributes
    const tagTokens = parseTagContent(tagContent, startPos);
    return {
      type: TOKEN_TYPES.TAG_OPEN,
      value: tagContent,
      start: startPos,
      end: tagEnd + 1,
      attributes: tagTokens,
      isSelfClosing
    };
  }

  // Parse tag content for attributes
  function parseTagContent(tagContent, tagStartPos) {
    const attributes = [];
    const content = tagContent.slice(1, -1); // Remove < and >

    let pos = 0;

    // Skip tag name
    while (pos < content.length && !/\s/.test(content[pos])) {
      pos++;
    }

    // Parse attributes
    while (pos < content.length) {
      // Skip whitespace
      while (pos < content.length && /\s/.test(content[pos])) {
        pos++;
      }

      if (pos >= content.length) break;

      // Check for placeholder as attribute name
      if (content.substr(pos, 13) === '__PLACEHOLDER') {
        const match = content.substring(pos).match(/^__PLACEHOLDER_(\d+)__/);
        if (match) {
          attributes.push({
            type: TOKEN_TYPES.PLACEHOLDER,
            subType: TOKEN_TYPES.ATTR_NAME,
            value: match[0],
            placeholderId: parseInt(match[1]),
            start: tagStartPos + 1 + pos,
            end: tagStartPos + 1 + pos + match[0].length
          });
          pos += match[0].length;
          continue;
        }
      }

      // Parse attribute name
      const attrStart = pos;
      while (pos < content.length && /[a-zA-Z0-9-_:]/.test(content[pos])) {
        pos++;
      }

      if (pos > attrStart) {
        const attrName = content.substring(attrStart, pos);

        // Skip whitespace around =
        while (pos < content.length && /\s/.test(content[pos])) {
          pos++;
        }

        if (pos < content.length && content[pos] === '=') {
          pos++; // Skip =

          // Skip whitespace after =
          while (pos < content.length && /\s/.test(content[pos])) {
            pos++;
          }

          // Parse attribute value
          if (pos < content.length) {
            const quote = content[pos];
            if (quote === '"' || quote === "'") {
              pos++; // Skip opening quote
              const valueStart = pos;

              // Find closing quote
              while (pos < content.length && content[pos] !== quote) {
                if (content[pos] === '\\') pos++; // Skip escaped char
                pos++;
              }

              if (pos < content.length) pos++; // Skip closing quote

              const attrValue = content.substring(valueStart, pos - 1);

              // Check if value contains placeholder
              const placeholderMatch = attrValue.match(/__PLACEHOLDER_(\d+)__/);
              if (placeholderMatch) {
                attributes.push({
                  type: TOKEN_TYPES.PLACEHOLDER,
                  subType: TOKEN_TYPES.ATTR_VALUE,
                  value: placeholderMatch[0],
                  placeholderId: parseInt(placeholderMatch[1]),
                  attrName: attrName,
                  start: tagStartPos + 1 + valueStart + attrValue.indexOf(placeholderMatch[0]),
                  end: tagStartPos + 1 + valueStart + attrValue.indexOf(placeholderMatch[0]) + placeholderMatch[0].length
                });
              }
            }
          }
        } else {
          // Attribute without value
          attributes.push({
            type: TOKEN_TYPES.ATTR_NAME,
            value: attrName,
            start: tagStartPos + 1 + attrStart,
            end: tagStartPos + 1 + pos
          });
        }
      } else {
        pos++;
      }
    }

    return attributes;
  }

  // Parse text content
  function parseText(template, startPos) {
    let pos = startPos;

    // Read until we hit a tag or placeholder
    while (pos < template.length &&
           template[pos] !== '<' &&
           !template.substr(pos, 13).startsWith('__PLACEHOLDER')) {
      pos++;
    }

    if (pos > startPos) {
      return {
        type: TOKEN_TYPES.TEXT,
        value: template.substring(startPos, pos),
        start: startPos,
        end: pos
      };
    }

    return null;
  }

  // Second pass: Replace placeholders with appropriate markers
  function replacePlaceholders(tokens, values, context) {
    let result = '';

    for (const token of tokens) {
      if (token.type === TOKEN_TYPES.PLACEHOLDER) {
        const valueId = token.placeholderId;
        const value = values[valueId];

        // Store value in context
        context.set(valueId, value);

        // Determine marker format based on token context
        let marker;
        const subType = token.subType || TOKEN_TYPES.TEXT;

        switch (subType) {
          case TOKEN_TYPES.ATTR_VALUE:
            marker = `::${valueId}`;
            break;
          case TOKEN_TYPES.ATTR_NAME:
            marker = `::${valueId}=""`;
            break;
          case TOKEN_TYPES.TEXT:
          default:
            marker = `<!-- ::${valueId} -->`;
            break;
        }

        result += marker;
      } else if (token.type === TOKEN_TYPES.TAG_OPEN && token.attributes) {
        // Handle tag with attributes
        let tagResult = token.value;

        // Process attributes with placeholders
        for (const attr of token.attributes) {
          if (attr.type === TOKEN_TYPES.PLACEHOLDER) {
            const valueId = attr.placeholderId;
            const value = values[valueId];
            context.set(valueId, value);

            let marker;
            switch (attr.subType) {
              case TOKEN_TYPES.ATTR_VALUE:
                marker = `::${valueId}`;
                break;
              case TOKEN_TYPES.ATTR_NAME:
                marker = `::${valueId}=""`;
                break;
              default:
                marker = `::${valueId}`;
                break;
            }

            tagResult = tagResult.replace(attr.value, marker);
          }
        }

        result += tagResult;
      } else {
        result += token.value;
      }
    }

    return result;
  }

  // Main execution
  const template = createTemplateWithPlaceholders(strings, values);
  const tokens = tokenize(template);
  const result = replacePlaceholders(tokens, values, context);

  return result;
}
