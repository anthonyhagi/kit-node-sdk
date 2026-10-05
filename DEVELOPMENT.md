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
- `npm run test:package-types` - After building, compile standalone ESM/CommonJS consumers against the packed SDK using TypeScript 6 and Node 22 type definitions
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

### Packed TypeScript Compatibility

CI checks the published declarations with TypeScript 5.0.4 (the minimum supported
compiler) and TypeScript 6. Each check packs and installs the SDK in a temporary
project, then compiles dedicated `.mts` and `.cts` consumers with strict checking
and `skipLibCheck: false`. The fixtures check public imports, inferred return
types, and rejected inputs without running API requests.

Run the same matrix locally after building:

```bash
npm run build
npm run test:package-types -- 5.0.4 22.0.0
npm run test:package-types -- 6 22
```

The arguments select TypeScript and `@types/node` versions. The minimum compiler
uses Node 22.0.0 type definitions; the current compiler uses the latest Node 22
types. This keeps the compiler check independent of newer syntax introduced in
Node type definitions. These commands install their compiler dependencies from
npm and remove the temporary project after checking.

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
