# @anthonyhagi/kit-node-sdk

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
