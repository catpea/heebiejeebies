## Two-Phase Processing

### Phase 1: Template Preparation
- **Join strings** with temporary `__PLACEHOLDER_N__` markers
- Creates a complete template string for full parsing
- Preserves interpolation positions with unique identifiers

### Phase 2: Tokenization & Replacement
- **Tokenize** the complete string into semantic tokens
- **Identify context** for each placeholder based on surrounding tokens
- **Replace** placeholders with appropriate markers

## Token Types

The tokenizer recognizes:
- **TAG_OPEN** - Opening tags with attribute parsing
- **TAG_CLOSE** - Closing tags
- **ATTR_NAME** - Attribute names
- **ATTR_VALUE** - Attribute values (quoted/unquoted)
- **TEXT** - Text content between tags
- **COMMENT** - HTML comments
- **PLACEHOLDER** - Temporary interpolation markers

## Key Features

### Accurate Context Detection
```javascript
// Placeholders inherit context from their token position:
// In TEXT token → <!-- ::id -->
// In ATTR_VALUE token → ::id
// In ATTR_NAME token → ::id=""
```

### Attribute Parsing
- **Quoted attributes**: `src="value"` with embedded placeholders
- **Unquoted attributes**: `width=100` scenarios
- **Dynamic attributes**: `${attrs}` as standalone attribute objects
- **Self-closing tags**: `<img ... />` proper handling

### Robust Token Boundaries
- Preserves exact token positions
- Handles nested structures correctly
- Manages whitespace and formatting

## Test Results

The implementation successfully handles:
- ✅ `<img src="${src}" alt="${alt}" ${attrs}/>`
- ✅ Complex attribute combinations
- ✅ Text interpolation
- ✅ Mixed attribute types
- ✅ Comments and edge cases

## Benefits Over Previous Approaches

1. **Accuracy** - Full parsing means perfect context detection
2. **Extensibility** - Easy to add new token types
3. **Debugging** - Token structure is inspectable
4. **Robustness** - Handles malformed HTML gracefully
5. **Performance** - Two-phase is faster than character-by-character for complex templates

This approach gives you the best balance of accuracy and maintainability, making it ideal for production template systems where correctness is paramount!
