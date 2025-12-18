// Simple global store for companyId
// CLIENT: Used to pass from SentryUserContext to beforeSendLog
// SERVER: Used to pass from middleware to beforeSendLog

let currentCompanyId: string | null = null;

export function setCompanyId(companyId: string | null) {
  currentCompanyId = companyId;
}

export function getCompanyId(): string | null {
  return currentCompanyId;
}
