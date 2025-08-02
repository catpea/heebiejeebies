export default function multiPassStrategy(context, strings, values) {
  // Phase 1: Mark - Replace interpolations with typed placeholders
  function phase1Mark(strings, values) {
    let markedTemplate = '';

    for (let i = 0; i < strings.length; i++) {
      markedTemplate += strings[i];

      if (i < values.length) {
        // Initial guess at context type based on simple heuristics
        const stringPart = strings[i];
        let initialType = 'TEXT'; // Default

        // Simple heuristics for initial typing
        if (/=\s*["'][^"']*$/.test(stringPart)) {
          initialType = 'ATTR';
        } else if (/\s+[\w-]*$/.test(stringPart)) {
          initialType = 'ATTR';
        } else if (/<!--[^>]*$/.test(stringPart)) {
          initialType = 'COMMENT';
        }

        markedTemplate += `__INTERP_${initialType}_${i}__`;
      }
    }

    return markedTemplate;
  }

  // Phase 2: Parse - Analyze HTML structure and verify/correct contexts
  function phase2Parse(markedTemplate) {
    const corrections = new Map();
    const tokens = [];

    // Tokenize the marked template
    let pos = 0;
    while (pos < markedTemplate.length) {
      const token = getNextToken(markedTemplate, pos);
      if (token) {
        tokens.push(token);
        pos = token.end;
      } else {
        pos++;
      }
    }

    // Analyze tokens to determine correct context for each placeholder
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];

      if (token.type === 'PLACEHOLDER') {
        const correctContext = determineCorrectContext(token, tokens, i);

        // If correction needed, store it
        if (correctContext !== token.initialType) {
          corrections.set(token.id, {
            from: token.initialType,
            to: correctContext,
            reason: correctContext.reason || 'Context analysis'
          });
        }
      }
    }

    return { tokens, corrections };
  }

  // Tokenizer for Phase 2
  function getNextToken(template, startPos) {
    let pos = startPos;

    // Skip whitespace
    while (pos < template.length && /\s/.test(template[pos])) {
      pos++;
    }

    if (pos >= template.length) return null;

    // Check for placeholder
    const placeholderMatch = template.substring(pos).match(/^__INTERP_(\w+)_(\d+)__/);
    if (placeholderMatch) {
      return {
        type: 'PLACEHOLDER',
        value: placeholderMatch[0],
        initialType: placeholderMatch[1],
        id: parseInt(placeholderMatch[2]),
        start: pos,
        end: pos + placeholderMatch[0].length
      };
    }

    // Check for comment start
    if (template.substr(pos, 4) === '<!--') {
      const endPos = template.indexOf('-->', pos + 4);
      return {
        type: 'COMMENT',
        value: template.substring(pos, endPos !== -1 ? endPos + 3 : template.length),
        start: pos,
        end: endPos !== -1 ? endPos + 3 : template.length
      };
    }

    // Check for tag
    if (template[pos] === '<') {
      const closePos = template.indexOf('>', pos);
      if (closePos !== -1) {
        const tagContent = template.substring(pos, closePos + 1);
        const isClosing = template[pos + 1] === '/';
        const isSelfClosing = template[closePos - 1] === '/';

        return {
          type: isClosing ? 'TAG_CLOSE' : 'TAG_OPEN',
          value: tagContent,
          isClosing,
          isSelfClosing,
          start: pos,
          end: closePos + 1,
          attributes: isClosing ? [] : parseTagAttributes(tagContent)
        };
      }
    }

    // Parse text content
    let textEnd = pos;
    while (textEnd < template.length &&
           template[textEnd] !== '<' &&
           !template.substring(textEnd).startsWith('__INTERP_')) {
      textEnd++;
    }

    if (textEnd > pos) {
      return {
        type: 'TEXT',
        value: template.substring(pos, textEnd),
        start: pos,
        end: textEnd
      };
    }

    return null;
  }

  // Parse attributes within a tag
  function parseTagAttributes(tagContent) {
    const attributes = [];
    const content = tagContent.slice(1, -1); // Remove < and >

    // Skip tag name
    let pos = 0;
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

      // Check for placeholder as attribute
      const placeholderMatch = content.substring(pos).match(/^__INTERP_(\w+)_(\d+)__/);
      if (placeholderMatch) {
        attributes.push({
          type: 'PLACEHOLDER_ATTR',
          initialType: placeholderMatch[1],
          id: parseInt(placeholderMatch[2]),
          context: 'ATTR_NAME'
        });
        pos += placeholderMatch[0].length;
        continue;
      }

      // Parse regular attribute
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

          // Check for quoted value with placeholder
          if (pos < content.length) {
            const quote = content[pos];
            if (quote === '"' || quote === "'") {
              pos++; // Skip opening quote
              const valueStart = pos;

              // Look for placeholder in value
              const valuePlaceholderMatch = content.substring(pos).match(/^__INTERP_(\w+)_(\d+)__/);
              if (valuePlaceholderMatch) {
                attributes.push({
                  type: 'PLACEHOLDER_ATTR_VALUE',
                  initialType: valuePlaceholderMatch[1],
                  id: parseInt(valuePlaceholderMatch[2]),
                  context: 'ATTR_VALUE',
                  attrName: attrName
                });
                pos += valuePlaceholderMatch[0].length;
              }

              // Find closing quote
              while (pos < content.length && content[pos] !== quote) {
                if (content[pos] === '\\') pos++; // Skip escaped char
                pos++;
              }

              if (pos < content.length) pos++; // Skip closing quote
            }
          }
        }
      } else {
        pos++;
      }
    }

    return attributes;
  }

  // Determine correct context based on token analysis
  function determineCorrectContext(placeholderToken, allTokens, tokenIndex) {
    // Look at surrounding tokens to determine context
    const prevToken = tokenIndex > 0 ? allTokens[tokenIndex - 1] : null;
    const nextToken = tokenIndex < allTokens.length - 1 ? allTokens[tokenIndex + 1] : null;

    // Check if we're inside a comment
    if (prevToken && prevToken.type === 'COMMENT' &&
        prevToken.value.includes(placeholderToken.value)) {
      return { type: 'COMMENT', reason: 'Inside HTML comment' };
    }

    // Check if we're in a tag context
    let inTag = false;
    let inAttrValue = false;

    // Look backwards for unclosed tag
    for (let i = tokenIndex - 1; i >= 0; i--) {
      const token = allTokens[i];
      if (token.type === 'TAG_CLOSE') {
        break; // Found closing tag, we're not in a tag
      }
      if (token.type === 'TAG_OPEN') {
        inTag = true;

        // Check if placeholder is in this tag's attributes
        for (const attr of token.attributes || []) {
          if (attr.type === 'PLACEHOLDER_ATTR' && attr.id === placeholderToken.id) {
            return { type: 'ATTR_NAME', reason: 'Standalone attribute' };
          }
          if (attr.type === 'PLACEHOLDER_ATTR_VALUE' && attr.id === placeholderToken.id) {
            return { type: 'ATTR_VALUE', reason: 'Attribute value' };
          }
        }
        break;
      }
    }

    // If not in tag, it's text content
    if (!inTag) {
      return { type: 'TEXT', reason: 'Text content outside tags' };
    }

    // Default fallback
    return { type: 'TEXT', reason: 'Fallback default' };
  }

  // Phase 3: Generate - Replace placeholders with final markers
  function phase3Generate(markedTemplate, corrections, values, context) {
    let result = markedTemplate;

    // Apply corrections and generate final markers
    for (let i = 0; i < values.length; i++) {
      const value = values[i];
      const correction = corrections.get(i);

      // Determine final context type
      let finalType = correction ? correction.to.type : 'TEXT';

      // Store value with corrected context information
      context.set(i, {
        value: value,
        originalType: correction ? correction.from : 'TEXT',
        finalType: finalType,
        correction: correction || null
      });

      // Generate appropriate marker
      let finalMarker;
      switch (finalType) {
        case 'ATTR_VALUE':
          finalMarker = `::${i}`;
          break;
        case 'ATTR_NAME':
          finalMarker = `::${i}=""`;
          break;
        case 'COMMENT':
        case 'TEXT':
        default:
          finalMarker = `<!-- ::${i} -->`;
          break;
      }

      // Replace placeholder with final marker
      const placeholderPattern = new RegExp(`__INTERP_\\w+_${i}__`, 'g');
      result = result.replace(placeholderPattern, finalMarker);
    }

    return result;
  }

  // Main execution: Run all three phases
  // console.log('=== Multi-Pass Strategy Execution ===');

  // Phase 1: Mark
  // console.log('Phase 1: Marking interpolations...');
  const markedTemplate = phase1Mark(strings, values);
  // console.log('Marked template:', markedTemplate);

  // Phase 2: Parse
  // console.log('\nPhase 2: Parsing and analyzing context...');
  const { tokens, corrections } = phase2Parse(markedTemplate);
  // console.log('Tokens found:', tokens.length);
  // console.log('Corrections needed:', corrections.size);

  if (corrections.size > 0) {
    // console.log('Context corrections:');
    corrections.forEach((correction, id) => {
      // console.log(`  ::${id}: ${correction.from} → ${correction.to.type} (${correction.to.reason})`);
    });
  }

  // Phase 3: Generate
  // console.log('\nPhase 3: Generating final markers...');
  const result = phase3Generate(markedTemplate, corrections, values, context);

  return result;
}
