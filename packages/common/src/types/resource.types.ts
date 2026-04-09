import type { GetResourceValue } from './output.types';
import type {
  ApiRestScopedNames,
  AuthScopedNames,
  BucketScopedNames,
  DynamoTableScopedNames,
  EventBusScopedNames,
  QueueScopedNames,
  StateMachineScopedNames,
} from './override-resources.types';

export interface ClassResource {
  new (...args: any[]): {};
}

export interface TerraformToken {
  /**
   * Converts a Terraform token string into a list of strings.
   *
   * @param value - The Terraform token string to convert.
   */
  asList: (value: string) => string[];
  /**
   * Converts a Terraform token string into a number.
   *
   * @param value - The Terraform token string to convert.
   */
  asNumber: (value: string) => number;
  /**
   * Converts a Terraform token into a string representation.
   *
   * @param value - The Terraform token to convert.
   */
  asString: (value: string) => string;
  /**
   * Checks whether a value is an unresolved Terraform token.
   *
   * @param value - The value to check.
   */
  isUnresolved: (value: unknown) => boolean;
}

export interface TerraformFn {
  /** Returns the absolute value of the given number. */
  abs(num: number): number;

  /** Converts a filesystem path to an absolute path. */
  abspath(path: string): string;

  /** Decodes a Base64-encoded string. */
  base64decode(str: string): string;

  /** Encodes a string to Base64. */
  base64encode(str: string): string;

  /** Compresses a string with gzip and encodes the result in Base64. */
  base64gzip(str: string): string;

  /** Computes the SHA256 hash of a string and encodes it in Base64. */
  base64sha256(str: string): string;

  /** Computes the SHA512 hash of a string and encodes it in Base64. */
  base64sha512(str: string): string;

  /** Removes all except the last portion from a filesystem path. */
  basename(path: string): string;

  /** @internal Computes a bcrypt hash of the given string. */
  _bcrypt(str: string, cost: number[]): string;

  /** Returns the closest whole number greater than or equal to the given value. */
  ceil(num: number): number;

  /** Removes trailing newline characters from a string. */
  chomp(str: string): string;

  /** Splits a list into fixed-size chunks, returning a list of lists. */
  chunklist(list: any[], size: number): string[];

  /** Calculates a full host IP address within a given CIDR prefix. */
  cidrhost(prefix: string, hostnum: number): string;

  /** Converts an IPv4 CIDR notation prefix into a subnet mask address. */
  cidrnetmask(prefix: string): string;

  /** Calculates a subnet address within a given IP network prefix. */
  cidrsubnet(prefix: string, newbits: number, netnum: number): string;

  /** Calculates a sequence of consecutive IP address ranges within a CIDR prefix. */
  cidrsubnets(prefix: string, newbits: number[]): string[];

  /** Returns the first non-null, non-empty value from the arguments. */
  coalesce(vals: any[]): any;

  /** Returns the first non-empty list from the arguments. */
  coalescelist(vals: any[]): any;

  /** Removes empty string elements from a list. */
  compact(list: string[]): string[];

  /** Combines two or more lists into a single list. */
  concat(seqs: any[]): any;

  /** Returns `true` if a list or set contains the given value. */
  contains(list: any, value: any): any;

  /** Decodes a CSV-formatted string into a list of maps. */
  csvdecode(str: string): any;

  /** Removes the last portion from a filesystem path. */
  dirname(path: string): string;

  /** Returns a new list with duplicate elements removed. */
  distinct(list: any[]): string[];

  /** Retrieves a single element from a list by index (wraps around). */
  element(list: any, index: number): any;

  /** Reads the contents of a file at the given path as a string. */
  file(path: string): string;

  /** Reads a file and returns its contents as a Base64-encoded string. */
  filebase64(path: string): string;

  /** Computes the Base64-encoded SHA256 hash of a file's contents. */
  filebase64sha256(path: string): string;

  /** Computes the Base64-encoded SHA512 hash of a file's contents. */
  filebase64sha512(path: string): string;

  /** Computes the MD5 hash of a file's contents. */
  filemd5(path: string): string;

  /** Enumerates file names matching a glob pattern under a path. */
  fileset(path: string, pattern: string): string[];

  /** Computes the SHA1 hash of a file's contents. */
  filesha1(path: string): string;

  /** Computes the SHA256 hash of a file's contents. */
  filesha256(path: string): string;

  /** Computes the SHA512 hash of a file's contents. */
  filesha512(path: string): string;

  /** Flattens nested lists into a single flat list. */
  flatten(list: any): any;

  /** Returns the closest whole number less than or equal to the given value. */
  floor(num: number): number;

  /** Produces a formatted string using a `printf`-style format specifier. */
  format(format: string, args: any[]): any;

  /** Converts a timestamp into a different time format. */
  formatdate(format: string, time: string): string;

  /** Produces a list of formatted strings from a format specifier and arguments. */
  formatlist(format: string, args: any[]): any;

  /** Adds spaces to the beginning of all but the first line of a multi-line string. */
  indent(spaces: number, str: string): string;

  /** Finds the element index for a given value in a list. */
  index(list: any, value: any): any;

  /** @internal Joins multiple lists of strings with a separator. */
  _join(separator: string, lists: string[][]): string;

  /** Decodes a JSON string into a value. */
  jsondecode(str: string): any;

  /** Encodes a value as a JSON string. */
  jsonencode(val: any): string;

  /** Returns a list of keys from a map. */
  keys(inputMap: any): any;

  /** Returns the length of a list, map, or string. */
  lengthOf(value: any): number;

  /** Returns the logarithm of a number in the given base. */
  log(num: number, base: number): number;

  /** @internal Retrieves a value from a map by key, with a default fallback. */
  _lookup(inputMap: any, key: string, defaultValue: any[]): any;

  /** Converts all cased letters in a string to lowercase. */
  lower(str: string): string;

  /** Constructs a new list by matching indexes between values, keys, and a search set. */
  matchkeys(values: any[], keys: any[], searchset: any[]): string[];

  /** Returns the greatest number from the given set. */
  max(numbers: number[]): number;

  /** Computes the MD5 hash of a string in hexadecimal. */
  md5(str: string): string;

  /** Merges multiple maps or objects into a single map. */
  merge(maps: any[]): any;

  /** Returns the smallest number from the given set. */
  min(numbers: number[]): number;

  /** Removes the sensitive marking from a value. */
  nonsensitive(value: any): any;

  /** Returns the single element from a zero-or-one element collection, or `null`. */
  one(list: any): any;

  /** Parses a string as an integer in the specified base (2–62). */
  parseint(number: any, base: number): any;

  /** Expands a `~` prefix in a filesystem path to the user's home directory. */
  pathexpand(path: string): string;

  /** Returns a UTC timestamp string fixed to the time of the plan. */
  plantimestamp(): string;

  /** Raises a number to the power of another number. */
  pow(num: number, power: number): number;

  /** @internal Generates a list of numbers using start, limit, and step values. */
  _range(params: number[]): string[];

  /** Applies a regular expression to a string and returns matching substrings. */
  regex(pattern: string, str: string): any;

  /** Applies a regular expression to a string and returns all matches. */
  regexall(pattern: string, str: string): string[];

  /** Replaces all occurrences of a substring within a string. */
  replace(str: string, substr: string, replace: string): string;

  /** Returns a sequence with all elements in reverse order. */
  reverse(list: any): any;

  /** Decrypts an RSA-encrypted ciphertext and returns the cleartext. */
  rsadecrypt(ciphertext: string, privatekey: string): string;

  /** Marks a value as sensitive so Terraform suppresses it in output. */
  sensitive(value: any): any;

  /** Returns the intersection of multiple sets. */
  setintersection(first_set: any[], other_sets: any[][]): string[];

  /** Computes the Cartesian product of multiple sets. */
  setproduct(sets: any[]): any;

  /** Returns elements from the first set not present in the second set. */
  setsubtract(a: any[], b: any[]): string[];

  /** Returns the union of multiple sets. */
  setunion(first_set: any[], other_sets: any[][]): string[];

  /** Computes the SHA1 hash of a string in hexadecimal. */
  sha1(str: string): string;

  /** Computes the SHA256 hash of a string in hexadecimal. */
  sha256(str: string): string;

  /** Computes the SHA512 hash of a string in hexadecimal. */
  sha512(str: string): string;

  /** Returns -1, 0, or 1 representing the sign of a number. */
  signum(num: number): number;

  /** Extracts consecutive elements from a list between start and end indexes. */
  slice(list: any, start_index: number, end_index: number): any;

  /** Sorts a list of strings lexicographically. */
  sort(list: string[]): string[];

  /** Splits a string into a list by a separator. */
  split(separator: string, str: string): string[];

  /** Reverses the characters in a string (Unicode-aware). */
  strrev(str: string): string;

  /** Extracts a substring by offset and maximum length. */
  substr(str: string, offset: number, length: number): string;

  /** Returns the sum of all numbers in a list. */
  sum(list: any): any;

  /** Reads a file and renders its content as a template with the given variables. */
  templatefile(path: string, vars: any): any;

  /** Decodes a Base64 string using the specified character encoding. */
  textdecodebase64(source: string, encoding: string): string;

  /** Encodes a string using the specified character encoding and returns it in Base64. */
  textencodebase64(str: string, encoding: string): string;

  /** Adds a duration to a timestamp and returns the new timestamp. */
  timeadd(timestamp: string, duration: string): string;

  /** Compares two timestamps and returns -1, 0, or 1. */
  timecmp(timestamp_a: string, timestamp_b: string): number;

  /** Returns the current UTC timestamp in RFC 3339 format. */
  timestamp(): string;

  /** Converts the first letter of each word to uppercase. */
  title(str: string): string;

  /** Converts a value to a Terraform list type. */
  tolist(v: any): string[];

  /** Converts a value to a Terraform map type. */
  tomap(v: any): any;

  /** Converts a value to a number type. */
  tonumber(v: any): number;

  /** Converts a value to a Terraform set type (removes duplicates). */
  toset(v: any): string[];

  /** Converts a value to a string type. */
  tostring(v: any): string;

  /** Swaps the keys and values of a map of lists of strings. */
  transpose(values: any): any;

  /** Removes the specified characters from the start and end of a string. */
  trim(str: string, cutset: string): string;

  /** Removes the specified prefix from the start of a string. */
  trimprefix(str: string, prefix: string): string;

  /** Removes leading and trailing whitespace from a string. */
  trimspace(str: string): string;

  /** Removes the specified suffix from the end of a string. */
  trimsuffix(str: string, suffix: string): string;

  /** Evaluates expressions in order and returns the first one that doesn't error. */
  try(expressions: any[]): any;

  /** Converts all cased letters in a string to uppercase. */
  upper(str: string): string;

  /** Applies URL encoding to a string. */
  urlencode(str: string): string;

  /** Generates a unique identifier string (UUID v4). */
  uuid(): string;

  /** Generates a name-based UUID v5 from a namespace and name. */
  uuidv5(namespace: string, name: string): string;

  /** Returns a list of values from a map. */
  values(mapping: any): any;

  /** Parses a YAML string and returns its value. */
  yamldecode(src: string): any;

  /** Encodes a value as a YAML string. */
  yamlencode(value: any): string;

  /** Constructs a map from a list of keys and a corresponding list of values. */
  zipmap(keys: string[], values: any): any;
}

export interface GetResourceProps {
  /**
   * Retrieves an attribute value from a resource created by Lafken.
   *
   * Uses the format `'scope::resourceName'` to identify the resource,
   * where `scope` corresponds to the resource type prefix (e.g., `dynamo`, `bucket`,
   * `api`, `auth`, `event-bus`) or the module name (for queues and state machines).
   *
   * The second argument specifies the attribute to retrieve. Available attributes
   * depend on the resource type and correspond to the Terraform registry attribute
   * reference for each AWS resource.
   *
   * @param value - Resource identifier in `'scope::resourceName'` format.
   * @param type - Attribute to retrieve (`'arn'` or `'id'`).
   *
   * @example
   * // Get a DynamoDB table ID
   * getResourceValue('dynamo::users', 'id')
   *
   * @example
   * // Get a queue ARN
   * getResourceValue('orders-module::queue::processOrder', 'id')
   *
   * @example
   * // Get a bucket ARN
   * getResourceValue('bucket::uploads', 'arn')
   */
  getResourceValue: GetResourceValue<
    | DynamoTableScopedNames
    | AuthScopedNames
    | BucketScopedNames
    | ApiRestScopedNames
    | EventBusScopedNames
    | StateMachineScopedNames
    | QueueScopedNames
  >;
  /**
   * Retrieves a value from AWS Systems Manager Parameter Store.
   *
   * Resolves SSM parameter references at deployment time, allowing
   * access to configuration values stored in Parameter Store.
   *
   * @param value - The SSM parameter path (e.g., `'/my-app/database-url'`).
   * @param secure - When `true`, retrieves the parameter as a `SecureString`.
   *
   * @example
   * // Get a plain text parameter
   * getSSMValue('/my-app/api-key')
   *
   * @example
   * // Get a secure parameter
   * getSSMValue('/my-app/secret', true)
   */
  getSSMValue: (value: string, secure?: boolean) => string;

  /**
   * Provides access to Terraform built-in functions for string manipulation,
   * encoding, list operations, and conditional expressions.
   */
  fn: TerraformFn;
  /**
   * Provides access to Terraform token utilities for converting and inspecting
   * unresolved token values.
   */
  token: TerraformToken;
}
