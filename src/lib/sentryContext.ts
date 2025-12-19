// Client-side global storage for companyId
// This bridges the gap between SentryUserContext (where companyId is set)
// and beforeSendLog (where it's read) in the client runtime

let currentCompanyId: string | null = null;

export function setClientCompanyId(companyId: string | null) {
  currentCompanyId = companyId;
}

export function getClientCompanyId(): string | null {
  return currentCompanyId;
}
