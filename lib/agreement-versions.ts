// ====================================================================
// 🔒 AGREEMENT VERSION CONSTANTS
// ====================================================================
// Update these versions when agreement content changes

export const CURRENT_AGREEMENT_VERSIONS = {
  player: 2
  // Note: admin and all non-player roles are exempt from agreement enforcement
} as const;

export type AgreementRole = keyof typeof CURRENT_AGREEMENT_VERSIONS;

export interface AgreementStatus {
  requires_agreement: boolean;
  status: 'missing' | 'outdated' | 'declined' | 'pending' | 'current' | 'bypassed';
  current_version?: number;
  required_version: number;
  message: string;
}

export interface UserAgreement {
  id: string;
  user_id: string;
  role: AgreementRole;
  agreement_version: number;
  accepted_at: string;
  ip_address?: string;
  user_agent?: string;
  status: 'accepted' | 'pending' | 'declined';
  created_at: string;
  updated_at: string;
}

export interface AgreementContent {
  role: AgreementRole;
  current_version: number;
  title: string;
  last_updated: string;
  content: string;
}

// Helper function to get required version for a role
export function getRequiredAgreementVersion(role: string): number {
  return CURRENT_AGREEMENT_VERSIONS[role as AgreementRole] || 1;
}

// Helper function to check if role needs agreement
export function isAgreementRole(role: string): role is AgreementRole {
  return role in CURRENT_AGREEMENT_VERSIONS;
}
