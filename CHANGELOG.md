# @anthonyhagi/kit-node-sdk

## 0.3.0

### Minor Changes

- 4a09457: add `/subscribers/filter` endpoint
- 2a645ac: add `/subscriber/:id/stats` endpoint

## 0.2.5

### Patch Changes

- d77f07a: Ensure build files generated before release

## 0.2.4

### Patch Changes

- 182cf9b: Fix issue with cjs types not resolving correctly

## 0.2.3

### Patch Changes

- cf6e419: Bump dev dependencies to latest version

## 0.2.2

### Patch Changes

- 225269d: Bump dev dependencies to latest version

## 0.2.1

### Patch Changes

- 9db19d0: Resolved various issues related to the main api client:
  - Added test cases to ensure retry logic works as expected.
  - Added test cases to ensure retry configuration is respected.
  - Resolved a bug when a JSON body was unable to be parsed, the body was attempted to be parsed again as text.

## 0.2.0

### Minor Changes

- cd89a2b: add retry logic for 5xx adn 429 requests if they fail

## 0.1.2

### Patch Changes

- 3c9c0fb: Update readme with api documentation and relevant information

## 0.1.1

### Patch Changes

- 57e42dd: Update readme to reflect the publish status

## 0.1.0

### Minor Changes

- 8d4729f: Initial release of the Node.js SDK for the kit.com API.

  This SDK provides a simple way to interact with the kit.com API by handling requests to API endpoints. It also includes type-hinted parameters and responses to improve developer experience and reduce potential errors.
