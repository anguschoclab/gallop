## 2024-10-28 - Adding Exhaustiveness Checks to Intent Processing
**Learning:** Intents that form large discriminated unions (like AnyIntent) frequently have switch statements over them. A missing intent case in cost estimation can fail silently by falling through to a default case instead of causing a type error.
**Action:** Always include a 'never' exhaustive check in default blocks when switching on discriminated unions to convert missed cases into immediate compile-time errors.
