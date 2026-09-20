import { TRPCClientError } from "@trpc/client";
import { showErrorToast } from "@/src/features/notifications/showErrorToast";
import { translate as t } from "@/src/features/i18n/activeInstance";
import { i18nKey } from "@/src/features/i18n/i18nKey";

// Catch network level errors, e.g. by proxy rate-limiting

const httpStatusOverride: Record<number, keyof typeof errorTitleMap> = {
  429: "TOO_MANY_REQUESTS",
  524: "TIMEOUT",
};

const errorTitleMap = {
  BAD_REQUEST: i18nKey("Bad Request"),
  UNAUTHORIZED: i18nKey("Unauthorized"),
  FORBIDDEN: i18nKey("Forbidden"),
  NOT_FOUND: i18nKey("Not Found"),
  TIMEOUT: i18nKey("Timeout"),
  CONFLICT: i18nKey("Conflict"),
  PRECONDITION_FAILED: i18nKey("Precondition Failed"),
  PAYLOAD_TOO_LARGE: i18nKey("Payload Too Large"),
  METHOD_NOT_SUPPORTED: i18nKey("Method Not Supported"),
  UNPROCESSABLE_CONTENT: i18nKey("Unprocessable Content"),
  TOO_MANY_REQUESTS: i18nKey("Too Many Requests"),
  CLIENT_CLOSED_REQUEST: i18nKey("Client Closed Request"),
  INTERNAL_SERVER_ERROR: i18nKey("Internal Server Error"),
  SERVICE_UNAVAILABLE: i18nKey("Internal Server Error"),
} as const;

const getErrorTitleAndHttpCode = (error: TRPCClientError<any>) => {
  const httpStatus: number =
    typeof error.data?.httpStatus === "number" ? error.data.httpStatus : 500;

  if (httpStatus in httpStatusOverride) {
    return {
      errorTitle: errorTitleMap[httpStatusOverride[httpStatus]],
      httpStatus,
    };
  }

  const errorTitle =
    error.data?.code in errorTitleMap
      ? errorTitleMap[error.data?.code as keyof typeof errorTitleMap]
      : i18nKey("Unexpected Error");

  return { errorTitle, httpStatus };
};

const getErrorDescription = (httpStatus: number) => {
  switch (httpStatus) {
    case 429:
      return t("Rate limit hit. Please try again later.");
    case 524:
      return t("Request took too long to process. Please try again later.");
    default:
      // Check if it's a 5xx server error
      if (httpStatus >= 500 && httpStatus < 600) {
        return t(
          "Internal server error. We've received an alert about this issue and will be working on fixing it. Please reach out to support if this persists.",
        );
      }
      return t("Internal error");
  }
};

export const trpcErrorToast = (error: unknown) => {
  if (error instanceof TRPCClientError) {
    const { errorTitle, httpStatus } = getErrorTitleAndHttpCode(error);

    const path = error.data?.path;
    const description = getErrorDescription(httpStatus);

    showErrorToast(
      t(errorTitle),
      error.message ?? description,
      httpStatus >= 500 && httpStatus < 600 ? "ERROR" : "WARNING",
      path,
    );
  } else {
    showErrorToast(
      t("Unexpected Error"),
      t("An unexpected error occurred."),
      "ERROR",
    );
  }
};
