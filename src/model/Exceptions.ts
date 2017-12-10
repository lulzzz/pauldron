export class ValidationError extends Error {}
export class ClaimsError extends Error {}
export class InvalidTicketError extends Error {}
export class ExpiredTicketError extends Error {}
export class InvalidRPTError extends Error {}
export class ExpiredRPTError extends Error {}
export class NotAuthorizedByPolicyError extends Error {}
export class UMARedirect extends Error {
    umaServerParams: any;
    ticket: string;
}
export class UMARedirectError extends UMARedirect {}
