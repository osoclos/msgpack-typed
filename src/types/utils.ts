export const NoThisOverrideSym = Symbol();
export type RequireThisOverrideClass = { readonly [NoThisOverrideSym]: true; prototype: { readonly [NoThisOverrideSym]: true; }; }
