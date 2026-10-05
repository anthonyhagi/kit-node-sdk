# Development

[Project overview](README.md) · [Documentation index](docs/README.md)

## Prerequisites

- Node.js 24 (see `.nvmrc`; current development tools require Node.js >= 24.11)
- npm or equivalent package manager

The published SDK requires Node.js >= 22.0.0. Development tools use Node.js 24;
packed-package checks cover Node 22.0.0, latest Node 22, and Node 24 in CI.

## Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/anthonyhagi/kit-node-sdk.git
   cd kit-node-sdk
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Build the project:
   ```bash
   npm run build
   ```

## Available Scripts

- `npm run build` - Build the TypeScript code using tsdown
- `npm run clean` - Remove the dist directory
- `npm run typecheck` - Run TypeScript type checking
- `npm run lint` - Lint code with ESLint
- `npm run format` - Format code with Prettier
- `npm run test` - Run the test suite with Vitest
- `npm run test:package-runtime` - After building, pack and install the SDK in a temporary consumer and check ESM/CommonJS imports, requests, cancellation, and PKCE on the current Node runtime
- `npm run changeset` - Create a changeset for version management

## Testing

The project uses [Vitest](https://vitest.dev/) for testing with fetch mocking capabilities.

### Running Tests

```bash
# Run all tests
npm run test

# Run tests in watch mode (during development)
npm run test -- --watch

# Run tests with coverage
npm run test -- --coverage
```

### Test Structure

Tests are co-located with source files using the `.test.ts` suffix. The test suite includes:

- Unit tests for API client functionality
- Mock HTTP responses using `vitest-fetch-mock`
- Type safety validation
- Utility function testing

### Writing Tests

When adding new features, include corresponding test files. For example, after
`npm run build`, this test checks the public package interface using the project's
configured fetch mock:

```typescript
import { beforeEach, describe, expect, it } from "vitest";
import { Kit } from "@anthonyhagi/kit-node-sdk";

describe("accounts", () => {
  beforeEach(() => {
    fetchMock.resetMocks();
  });

  it("returns the account response", async () => {
    const response = { account: { name: "Test account" } };
    fetchMock.mockResponseOnce(JSON.stringify(response));

    const kit = new Kit({ apiKey: "test-key" });
    const result = await kit.accounts.getCurrentAccount();

    expect(result).toEqual(response);
  });
});
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed contribution guidelines.

## Code Quality

The project maintains high code quality through:

- **TypeScript** for type safety
- **ESLint** for code linting
- **Prettier** for code formatting
- **Vitest** for comprehensive testing
- **Changesets** for version management

Before submitting changes:

```bash
npm run lint      # Check for linting issues
npm run format    # Format code
npm run typecheck # Verify TypeScript types
npm run test      # Run test suite
```
