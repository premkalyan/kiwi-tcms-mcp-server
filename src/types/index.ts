// Kiwi TCMS MCP Server Types

import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties?: Record<string, any>;
    required?: string[];
    additionalProperties?: boolean;
  };
}

export type ToolResult = CallToolResult;

// Kiwi TCMS API Response Types
export interface KiwiProduct {
  id: number;
  name: string;
  description?: string;
  classification?: {
    id: number;
    name: string;
  };
  created_at?: string;
  updated_at?: string;
}

export interface KiwiVersion {
  id: number;
  value: string;
  product: number;
}

export interface KiwiTestPlan {
  id: number;
  name: string;
  text: string;
  product: number;
  product_version?: number;
  type: number;
  author: number;
  owner?: number;
  create_date: string;
  is_active: boolean;
  extra_link?: string;
  tag?: number[];
}

export interface KiwiTestCase {
  id: number;
  summary: string;
  text: string;
  setup: string;
  breakdown: string;
  action: string;
  expected_result: string;
  notes: string;
  case_status: number;
  category: number;
  priority: number;
  author: number;
  default_tester?: number;
  reviewer?: number;
  create_date: string;
  is_automated: boolean;
  script?: string;
  arguments?: string;
  extra_link?: string;
  requirement?: string;
  tag?: number[];
}

export interface KiwiTestRun {
  id: number;
  summary: string;
  notes: string;
  plan: number;
  build: number;
  manager: number;
  default_tester?: number;
  start_date?: string;
  stop_date?: string;
  planned_start?: string;
  planned_stop?: string;
  tag?: number[];
}

export interface KiwiTestExecution {
  id: number;
  assignee?: number;
  tested_by?: number;
  case: number;
  run: number;
  status: number;
  actual_duration?: number;
  start_date?: string;
  stop_date?: string;
  sortkey?: number;
}

export interface KiwiEnvironment {
  id: number;
  name: string;
  description?: string;
}

export interface KiwiBuild {
  id: number;
  name: string;
  version: number;
}

export interface KiwiTag {
  id: number;
  name: string;
}

export interface KiwiUser {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  date_joined: string;
  last_login?: string;
}

// MCP Tool Input Types
export interface ListProductsInput {
  query?: {
    name_contains?: string;
    limit?: number;
    cursor?: string;
  };
}

export interface ListPlansInput {
  product_id: number;
  version?: string;
  limit?: number;
  cursor?: string;
}

export interface ListCasesInput {
  plan_id?: number;
  product_id?: number;
  tags?: string[];
  component?: string;
  text?: string;
  limit?: number;
  cursor?: string;
}

export interface GetCaseInput {
  case_id: number;
}

export interface CreateRunInput {
  plan_id: number;
  build: string;
  environment: string;
  assignee?: string;
  case_ids: number[];
}

export interface AddCasesToRunInput {
  run_id: number;
  case_ids: number[];
}

export interface GetRunInput {
  run_id: number;
}

export interface ExecuteCaseInput {
  run_id: number;
  case_id: number;
  status: 'PASS' | 'FAIL' | 'BLOCKED' | 'ERROR';
  actual_result?: string;
  evidence?: Array<{
    type: 'log' | 'screenshot' | 'artifact';
    uri: string;
    title?: string;
  }>;
  duration_seconds?: number;
  rerun?: boolean;
  jira_issue_key?: string;
}

export interface AttachArtifactInput {
  execution_id: number;
  type: 'log' | 'screenshot' | 'artifact';
  uri: string;
  title?: string;
}

export interface LinkJiraInput {
  execution_id?: number;
  case_id?: number;
  issue_key: string;
}

export interface RunReportInput {
  run_id: number;
  format: 'json' | 'junit' | 'html';
}

export interface CreateCaseInput {
  product_id: number;
  summary: string;
  preconds?: string;
  steps: Array<{
    action: string;
    expected: string;
  }>;
  priority: 'P1' | 'P2' | 'P3' | 'P4';
  component?: string;
  tags?: string[];
}

export interface UpdateCaseInput {
  case_id: number;
  patch: {
    summary?: string;
    steps?: Array<{
      action: string;
      expected: string;
    }>;
    tags?: string[];
    [key: string]: any;
  };
}

// Status mappings
export interface TestExecutionStatus {
  IDLE: number;
  PASS: number;
  FAIL: number;
  BLOCKED: number;
  ERROR: number;
}

export interface Priority {
  P1: number;
  P2: number;
  P3: number;
  P4: number;
}

// Error types
export interface KiwiApiError {
  code: 'NOT_FOUND' | 'VALIDATION' | 'FORBIDDEN' | 'CONFLICT' | 'UPSTREAM_ERROR' | 'RATE_LIMIT';
  message: string;
  upstream_status?: number;
  details?: {
    kiwi_response?: any;
  };
}

// Pagination
export interface PaginatedResponse<T> {
  count: number;
  next?: string;
  previous?: string;
  results: T[];
}

export interface CursorPaginatedResponse<T> {
  items: T[];
  next_cursor?: string;
}

// Report formats
export interface TestRunReport {
  pass: number;
  fail: number;
  blocked: number;
  error: number;
  total: number;
}

export interface JunitReport {
  content_b64: string;
}

export interface HtmlReport {
  content_b64: string;
}
