// Global store for client-side companyId
// This is set by SentryUserContext and read by beforeSendLog

let currentCompanyId: string | null = null;

export function setClientCompanyId(companyId: string | null) {
  currentCompanyId = companyId;
}

export function getClientCompanyId(): string | null {
  return currentCompanyId;
}
