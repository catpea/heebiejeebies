## Core Regex Patterns

**Primary Detection Patterns:**
- **ATTR_VALUE**: `/=\s*["'][^"']*$/` - Detects quoted attribute values
- **ATTR_NAME**: `/\s+[\w-]*$/` - Detects attribute name position
- **TEXT_AFTER_TAG**: `/>[^<]*$/` - Detects text content after tags

**Additional Patterns for Robustness:**
- Unquoted attribute values
- Tag context detection
- Comment context handling

## Context Detection Logic

The `detectContext()` function analyzes the **ending** of each string segment:

1. **Quoted Attribute Values** - `=\s*["'][^"']*$`
2. **Unquoted Attribute Values** - `=\s*[^"'\s>]*$`
3. **Attribute Names** - `\s+[\w-]*$`
4. **Text Content** - `>[^<]*$`
5. **Tag Context** - `<[^>]*$` (fallback to ATTR_NAME)
6. **Default** - TEXT context

## Defensive Programming

**Validation Functions:**
- `isValidContext()` - Validates detected context makes sense
- `hasUnescapedQuote()` - Handles escape sequences
- Fallback to TEXT context for malformed HTML

## Key Benefits Over State Machine

1. **Performance** - Single regex check vs character-by-character parsing
2. **Simplicity** - Easier to understand and debug
3. **Maintainability** - Adding new patterns is straightforward

## Test Results

The implementation correctly handles:
- ✅ `<Panel width="${width}" ${dynamicAttr}>Content ${text}</Panel>`
- ✅ Complex attribute scenarios with multiple interpolations
- ✅ Edge cases and malformed HTML (defensive fallbacks)
- ✅ Quoted strings with embedded quotes
- ✅ Self-closing tags

**Trade-offs:**
- **Speed**: Much faster than state machine
- **Accuracy**: May miss some complex edge cases that state machine catches
- **Best for**: Well-formed templates with predictable structure

This approach gives you excellent performance for the 90% case while still being robust enough for production use!
