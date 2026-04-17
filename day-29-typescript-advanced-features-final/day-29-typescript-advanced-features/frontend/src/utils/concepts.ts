// src/utils/concepts.ts
// Static data for the interactive playground UI.

import { TypeConcept } from '../types/index.js';

export const CONCEPTS: TypeConcept[] = [
  {
    id: 'template-literal',
    title: 'Template Literal Types',
    category: 'template-literal',
    difficulty: 'intermediate',
    description: 'Combine string literals at the type level to generate unions of string patterns.',
    problem: 'You need type-safe event names, API routes, or CSS utilities but string is too broad.',
    solution: 'Use template literal types to define the exact set of valid strings.',
    codeExample: `type Method = 'GET' | 'POST' | 'DELETE';
type Version = 'v1' | 'v2';
type Resource = 'users' | 'products';

// Generates: "GET /v1/users" | "GET /v1/products" | "POST /v1/users" | ...
type ApiRoute = \`\${Method} /\${Version}/\${Resource}\`;

// Autocomplete works! TS knows all valid combinations.
function callApi(route: ApiRoute) { /* ... */ }
callApi('GET /v1/users');    // ✓
callApi('FETCH /v1/users');  // ✗ Type error!`,
    compilesTo: 'Pure compile-time — zero runtime overhead',
  },
  {
    id: 'conditional-infer',
    title: 'Conditional Types + infer',
    category: 'conditional',
    difficulty: 'advanced',
    description: 'Extract type information from other types using conditional branches and the infer keyword.',
    problem: 'You want to write utility types that adapt based on their input — like ReturnType<T> or Awaited<T>.',
    solution: 'Use T extends Pattern ? TrueType : FalseType with infer to capture sub-types.',
    codeExample: `// Extract resolved type of any Promise (however deeply nested)
type UnwrapPromise<T> =
  T extends Promise<infer U>
    ? UnwrapPromise<U>   // Recurse!
    : T;

type A = UnwrapPromise<Promise<string>>;           // string
type B = UnwrapPromise<Promise<Promise<number>>>;  // number
type C = UnwrapPromise<boolean>;                   // boolean

// Extract element type from array
type ElementOf<T> = T extends (infer E)[] ? E : never;
type N = ElementOf<number[]>;   // number
type S = ElementOf<string[][]>; // string[]`,
    compilesTo: 'Pure compile-time — zero runtime overhead',
  },
  {
    id: 'branded',
    title: 'Branded / Nominal Types',
    category: 'branded',
    difficulty: 'advanced',
    description: 'Add phantom type tags to prevent mixing structurally identical types with different semantics.',
    problem: 'TypeScript uses structural typing — two string types are interchangeable even if one is a UserId and the other an OrderId.',
    solution: 'Brand the type with a unique symbol so the compiler treats them as distinct.',
    codeExample: `declare const __brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [__brand]: B };

type UserId  = Brand<string, 'UserId'>;
type OrderId = Brand<string, 'OrderId'>;

// Smart constructor: validate + brand
function toUserId(id: string): UserId {
  if (!id) throw new Error('empty');
  return id as UserId;
}

function getUser(id: UserId) { /* ... */ }

const userId  = toUserId('usr_123');
const orderId = 'ord_456' as OrderId;

getUser(userId);   // ✓
getUser(orderId);  // ✗ Type error: OrderId ≠ UserId
getUser('raw');    // ✗ Type error: string ≠ UserId`,
    compilesTo: 'Zero runtime cost — brand is a phantom type (erased at compile time)',
  },
  {
    id: 'recursive',
    title: 'Recursive Types',
    category: 'recursive',
    difficulty: 'advanced',
    description: 'Types that reference themselves to describe arbitrarily deep data structures.',
    problem: 'Standard object types cannot describe trees, JSON, or infinitely nested structures.',
    solution: 'Define types that reference themselves — TypeScript resolves them lazily.',
    codeExample: `// Full JSON value type (recursive)
type JsonValue =
  | string | number | boolean | null
  | JsonValue[]                       // Array of JsonValues
  | { [key: string]: JsonValue };     // Object with JsonValue values

// DeepReadonly — makes every nested property readonly
type DeepReadonly<T> =
  T extends (infer U)[]
    ? ReadonlyArray<DeepReadonly<U>>
    : T extends object
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T;

type Config = { server: { port: number; host: string }; debug: boolean };
type FrozenConfig = DeepReadonly<Config>;
// { readonly server: { readonly port: number; readonly host: string }; ... }`,
    compilesTo: 'Pure compile-time — zero runtime overhead',
  },
  {
    id: 'route-params',
    title: 'Type-Safe Route Params',
    category: 'template-literal',
    difficulty: 'expert',
    description: 'Extract route parameter names from path strings at the type level.',
    problem: 'Express route params are typed as Record<string, string> — any typo compiles but fails at runtime.',
    solution: 'Use template literal + conditional types to extract param names from the path string itself.',
    codeExample: `type ExtractRouteParams<Path extends string> =
  Path extends \`\${string}:\${infer Param}/\${infer Rest}\`
    ? Param | ExtractRouteParams<\`/\${Rest}\`>
    : Path extends \`\${string}:\${infer Param}\`
    ? Param
    : never;

type RouteParams<Path extends string> = {
  [K in ExtractRouteParams<Path>]: string
};

// Usage — params are INFERRED from the path string:
function handler<P extends string>(
  path: P,
  fn: (params: RouteParams<P>) => void
) { /* ... */ }

handler('/users/:userId/orders/:orderId', ({ params }) => {
  console.log(params.userId);    // ✓ typed as string
  console.log(params.orderId);   // ✓ typed as string
  console.log(params.missing);   // ✗ Type error!
});`,
    compilesTo: 'Pure compile-time — zero runtime overhead',
  },
  {
    id: 'mapped-advanced',
    title: 'Advanced Mapped Types',
    category: 'mapped',
    difficulty: 'advanced',
    description: 'Transform object types with key remapping, filtering, and value transformation.',
    problem: 'You need to derive new types from existing ones — make some keys required, rename keys, or filter by value type.',
    solution: 'Combine mapped types with conditional types and key remapping via as.',
    codeExample: `// Make specific keys required, rest optional
type RequireFields<T, K extends keyof T> =
  Omit<T, K> & Required<Pick<T, K>>;

// Extract only function keys from an object type
type FunctionKeys<T> = {
  [K in keyof T]: T[K] extends (...args: never[]) => unknown ? K : never
}[keyof T];

interface API {
  getUser: (id: string) => User;
  postOrder: (data: Order) => void;
  baseUrl: string;         // not a function
  timeout: number;         // not a function
}

type APIActions = FunctionKeys<API>;
// = "getUser" | "postOrder"   (baseUrl and timeout excluded!)`,
    compilesTo: 'Pure compile-time — zero runtime overhead',
  },
];
