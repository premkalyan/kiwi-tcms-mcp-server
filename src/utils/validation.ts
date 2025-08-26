// Validation utilities for Kiwi TCMS MCP Server

export function validateEnvironment(): void {
  const required = [
    'KIWI_BASE_URL',
    'KIWI_TOKEN'
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Validate KIWI_BASE_URL format
  const baseUrl = process.env.KIWI_BASE_URL!;
  try {
    new URL(baseUrl);
  } catch (error) {
    throw new Error(`Invalid KIWI_BASE_URL format: ${baseUrl}`);
  }

  // Validate token is not empty
  const token = process.env.KIWI_TOKEN!;
  if (token.trim().length === 0) {
    throw new Error('KIWI_TOKEN cannot be empty');
  }
}

export function validateStatus(status: string): boolean {
  const validStatuses = ['PASS', 'FAIL', 'BLOCKED', 'ERROR', 'IDLE'];
  return validStatuses.includes(status.toUpperCase());
}

export function validatePriority(priority: string): boolean {
  const validPriorities = ['P1', 'P2', 'P3', 'P4'];
  return validPriorities.includes(priority.toUpperCase());
}

export function validateUriScheme(uri: string): boolean {
  try {
    const url = new URL(uri);
    const validSchemes = ['http', 'https', 's3', 'file'];
    return validSchemes.includes(url.protocol.slice(0, -1));
  } catch {
    return false;
  }
}

export function validateJiraIssueKey(issueKey: string): boolean {
  // Basic JIRA issue key pattern: PROJECT-123
  const pattern = /^[A-Z][A-Z0-9]*-[0-9]+$/;
  return pattern.test(issueKey);
}

export function validateEmail(email: string): boolean {
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return pattern.test(email);
}

export function sanitizeInput(input: any): any {
  if (typeof input === 'string') {
    // Remove potentially dangerous characters
    return input.replace(/[<>\"'&]/g, '');
  }
  
  if (Array.isArray(input)) {
    return input.map(sanitizeInput);
  }
  
  if (typeof input === 'object' && input !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }
  
  return input;
}

export function validateTestSteps(steps: Array<{ action: string; expected: string }>): boolean {
  if (!Array.isArray(steps) || steps.length === 0) {
    return false;
  }
  
  return steps.every(step => 
    step && 
    typeof step.action === 'string' && 
    typeof step.expected === 'string' &&
    step.action.trim().length > 0 &&
    step.expected.trim().length > 0
  );
}

export function validateId(id: any): boolean {
  return typeof id === 'number' && id > 0 && Number.isInteger(id);
}

export function validateLimitAndOffset(limit?: number, offset?: number): { limit: number; offset: number } {
  const validatedLimit = Math.min(Math.max(limit || 50, 1), 1000);
  const validatedOffset = Math.max(offset || 0, 0);
  
  return { limit: validatedLimit, offset: validatedOffset };
}
