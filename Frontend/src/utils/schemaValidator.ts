/**
 * Schema Validator Utility
 *
 * Validates Somnia Data Streams schema format (CSV string of Solidity types)
 */

// Valid Solidity types for schemas
const VALID_TYPES = [
  "address",
  "bool",
  "string",
  "bytes",
  "uint8",
  "uint16",
  "uint32",
  "uint64",
  "uint128",
  "uint256",
  "int8",
  "int16",
  "int32",
  "int64",
  "int128",
  "int256",
  "bytes1",
  "bytes2",
  "bytes3",
  "bytes4",
  "bytes8",
  "bytes16",
  "bytes32",
];

// Regex patterns for dynamic types
const DYNAMIC_TYPE_PATTERNS = [
  /^uint\d+$/, // uint<M> where 8 <= M <= 256 and M % 8 == 0
  /^int\d+$/, // int<M>
  /^bytes\d+$/, // bytes<M> where 1 <= M <= 32
  /^bytes\[\d*\]$/, // bytes[] or bytes[N]
  /^\w+\[\d*\]$/, // type[] or type[N]
];

export interface SchemaValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  fields: SchemaField[];
}

export interface SchemaField {
  name: string;
  type: string;
}

/**
 * Validates a schema definition string
 * Format: "type1 name1, type2 name2, ..."
 */
export function validateSchema(schema: string): SchemaValidationResult {
  const result: SchemaValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    fields: [],
  };

  if (!schema || schema.trim().length === 0) {
    result.isValid = false;
    result.errors.push("Schema cannot be empty");
    return result;
  }

  // Split by comma to get individual fields
  const fieldStrings = schema
    .split(",")
    .map((f) => f.trim())
    .filter((f) => f.length > 0);

  if (fieldStrings.length === 0) {
    result.isValid = false;
    result.errors.push("Schema must contain at least one field");
    return result;
  }

  const fieldNames = new Set<string>();

  for (let i = 0; i < fieldStrings.length; i++) {
    const fieldStr = fieldStrings[i];
    const parts = fieldStr.split(/\s+/);

    if (parts.length !== 2) {
      result.isValid = false;
      result.errors.push(
        `Field ${i + 1}: Invalid format "${fieldStr}". Expected "type name"`
      );
      continue;
    }

    const [type, name] = parts;

    // Validate type
    if (!isValidType(type)) {
      result.isValid = false;
      result.errors.push(
        `Field ${i + 1}: Invalid type "${type}". Must be a valid Solidity type`
      );
    }

    // Validate name
    if (!isValidFieldName(name)) {
      result.isValid = false;
      result.errors.push(
        `Field ${i +
          1}: Invalid name "${name}". Must start with letter and contain only alphanumeric characters and underscores`
      );
    }

    // Check for duplicate names
    if (fieldNames.has(name)) {
      result.isValid = false;
      result.errors.push(`Field ${i + 1}: Duplicate field name "${name}"`);
    }
    fieldNames.add(name);

    result.fields.push({ type, name });
  }

  // Warnings
  if (result.fields.length > 20) {
    result.warnings.push(
      "Schema has more than 20 fields. Consider splitting into multiple schemas."
    );
  }

  return result;
}

/**
 * Check if a type is valid Solidity type
 */
function isValidType(type: string): boolean {
  // Check static types
  if (VALID_TYPES.includes(type)) {
    return true;
  }

  // Check dynamic patterns
  for (const pattern of DYNAMIC_TYPE_PATTERNS) {
    if (pattern.test(type)) {
      // Additional validation for uint/int bit sizes
      if (type.startsWith("uint") || type.startsWith("int")) {
        const match = type.match(/\d+$/);
        if (match) {
          const bits = parseInt(match[0]);
          if (bits >= 8 && bits <= 256 && bits % 8 === 0) {
            return true;
          }
        }
      }
      // Additional validation for bytes sizes
      else if (type.startsWith("bytes") && !type.includes("[")) {
        const match = type.match(/\d+$/);
        if (match) {
          const size = parseInt(match[0]);
          if (size >= 1 && size <= 32) {
            return true;
          }
        }
      } else {
        return true;
      }
    }
  }

  return false;
}

/**
 * Check if field name is valid
 */
function isValidFieldName(name: string): boolean {
  // Must start with letter or underscore, contain only alphanumeric and underscores
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
}

/**
 * Format schema string (clean up whitespace)
 */
export function formatSchema(schema: string): string {
  return schema
    .split(",")
    .map((f) => f.trim())
    .filter((f) => f.length > 0)
    .map((f) => f.replace(/\s+/g, " "))
    .join(", ");
}

/**
 * Get example schemas
 */
export function getSchemaExample(
  type: "simple" | "token" | "user" | "event"
): string {
  const examples = {
    simple: "uint256 value, string message",
    token:
      "address token, address sender, address recipient, uint256 amount, uint256 timestamp",
    user:
      "address userAddress, string username, uint256 reputation, bool isVerified",
    event:
      "string eventName, uint256 timestamp, bytes32 eventId, address organizer, uint256 attendeeCount",
  };
  return examples[type];
}
