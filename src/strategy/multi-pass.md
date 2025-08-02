## Three-Phase Architecture

### Phase 1: Mark
- **Simple substitution** with initial type guesses: `__INTERP_TYPE_ID__`
- **Quick heuristics** for initial classification:
  - `=\s*["'][^"']*$` → `ATTR` (attribute context)
  - `\s+[\w-]*$` → `ATTR` (attribute name)
  - `<!--[^>]*$` → `COMMENT` (comment context)
  - Default → `TEXT`

### Phase 2: Parse & Analyze
- **Full HTML tokenization** of the marked template
- **Context verification** through structural analysis
- **Correction detection** when initial guesses are wrong
- **Rich token analysis** including attribute parsing

### Phase 3: Generate
- **Apply corrections** from Phase 2 analysis
- **Generate final markers** based on verified context
- **Store comprehensive metadata** in context Map

## Key Features

### Context Correction System
```javascript
// Automatically detects and corrects misclassifications
corrections.set(id, {
  from: 'TEXT',           // Initial guess
  to: 'ATTR_VALUE',       // Verified context
  reason: 'Attribute value in quoted string'
});
```

### Comprehensive Token Analysis
- **Tag parsing** with attribute detection
- **Comment boundary** recognition
- **Placeholder positioning** within HTML structure
- **Context inheritance** from surrounding tokens

### Rich Metadata Storage
```javascript
context.set(id, {
  value: signalObject,
  originalType: 'TEXT',
  finalType: 'ATTR_VALUE',
  correction: correctionInfo
});
```

## Test Results

The implementation successfully handles:
- ✅ `<Panel ${props} style="${styles}"><!-- ${comment} --></Panel>`
- ✅ Context corrections for misclassified interpolations
- ✅ Multiple complex scenarios with mixed contexts
- ✅ Edge cases with comments and attribute combinations

## Phase Execution Visibility

The strategy provides **full transparency**:
- **Phase 1 output**: Shows marked template with initial classifications
- **Phase 2 analysis**: Lists all tokens found and corrections needed
- **Phase 3 result**: Final markers with verified contexts

## Benefits Over Other Approaches

1. **Maximum Accuracy** - Three-phase verification catches all edge cases
2. **Self-Correcting** - Automatically fixes initial misclassifications
3. **Transparent** - Full visibility into the parsing process
4. **Extensible** - Easy to add new validation rules
5. **Robust** - Handles malformed HTML gracefully
6. **Debuggable** - Rich metadata for troubleshooting

## When to Use This Strategy

**Best for:**
- **Production systems** where accuracy is critical
- **Complex templates** with mixed contexts
- **Debugging scenarios** where you need full parsing insight
- **Validation systems** that need to verify template correctness

**Trade-offs:**
- **Performance**: Slower than single-pass approaches
- **Complexity**: More sophisticated than needed for simple templates
- **Memory**: Stores more metadata than lightweight approaches

This is the most sophisticated approach that provides maximum accuracy through systematic verification. This multi-pass strategy represents the **gold standard** for template parsing - when you absolutely need to get the context right every time, regardless of template complexity!
