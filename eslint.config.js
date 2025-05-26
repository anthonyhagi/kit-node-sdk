import { sxzz } from "@sxzz/eslint-config";

export default sxzz({ prettier: true }, [
  { rules: { "perfectionist/sort-imports": "off" } },
]);
