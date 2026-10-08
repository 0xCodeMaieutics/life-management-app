## Clean Code

### Variable naming conventions

Avoid abbreviations; prefer descriptive, intention-revealing names.

Examples:

```
amt → amount
qty → quantity
dest → destination
src → source
errMsg → errorMessage
```

### Boolean variables name

Boolean variable names should either start with: has or is

**Example:**

```tsx
const { control, register, formState } = form;
const hasFormChanged = formState.isDirty;
```

### Atomic Changes

- Make the smallest complete change that solves the current problem.
- Change one concern at a time.
- Do not mix a bug fix with unrelated refactoring or optimization.
- Verify each change before starting the next.

### Avoid premature abstractions

Favor inline code instead of pre-maturely abstracing a functions or piece of code.

Only abstract then when it's explicitply is asked.
