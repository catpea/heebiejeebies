export function query(data, path) {
    // Remove leading $ and split by dots, but handle array brackets separately
    const pathWithoutDollar = path.startsWith('$') ? path.slice(1) : path;
    const tokens = pathWithoutDollar.split('.').filter(Boolean);

    let currentNode = data;

    for (let token of tokens) {
        // Check if token contains array bracket notation
        if (token.includes('[')) {
            // Split token into property name and bracket content
            const bracketIndex = token.indexOf('[');
            const propertyName = token.slice(0, bracketIndex);
            const bracketContent = token.slice(bracketIndex + 1, -1); // Remove [ and ]

            // Navigate to the property first
            if (propertyName) {
                currentNode = currentNode[propertyName];
            }

            // Handle bracket content
            if (bracketContent.startsWith('?')) {
                // Filter condition
                const condition = bracketContent.slice(1); // Remove ?
                currentNode = currentNode.filter(item => {
                    // Replace @ with item and safely evaluate
                    try {
                        return eval(condition.replace(/@/g, 'item'));
                    } catch (e) {
                        console.error('Error evaluating condition:', condition, e);
                        return false;
                    }
                });
            } else if (!isNaN(bracketContent)) {
                // Array index
                currentNode = currentNode[parseInt(bracketContent)];
            }
        } else {
            // Simple property access
            if (Array.isArray(currentNode)) {
                // If current node is an array, map over it to get the property from each item
                currentNode = currentNode.map(item => item[token]);
            } else {
                // currentNode = currentNode[token];
                currentNode = currentNode.children.find(child=>child.name==token)
            }
        }

        // Check if currentNode is undefined
        if (currentNode === undefined) {
            return undefined;
        }
    }

    return currentNode;
}

// // Example data
// const data = {
//     store: {
//         book: [
//             { title: "Book A", price: 15 },
//             { title: "Book B", price: 8 },
//             { title: "Book C", price: 12 },
//             { title: "Book D", price: 5 }
//         ]
//     }
// };

// // Test the fixed function
// console.log('=== Testing JSONPath Implementation ===');

// // Querying titles of books with price less than 10
// const result = jsonPath(data, '$.store.book[?@.price < 10].title');
// console.log('Books with price < 10 (titles):', result);
// // Expected: ["Book B", "Book D"]

// // Additional test cases
// console.log('\n=== Additional Test Cases ===');

// // Get all books
// const allBooks = jsonPath(data, '$.store.book');
// console.log('All books:', allBooks);

// // Get first book
// const firstBook = jsonPath(data, '$.store.book[0]');
// console.log('First book:', firstBook);

// // Get all book titles
// const allTitles = jsonPath(data, '$.store.book.title');
// console.log('All titles:', allTitles);

// // Get books with price >= 12
// const expensiveBooks = jsonPath(data, '$.store.book[?@.price >= 12]');
// console.log('Books with price >= 12:', expensiveBooks);
