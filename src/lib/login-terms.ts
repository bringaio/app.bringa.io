export type TermsCheckedState = boolean | "indeterminate";

export type LoginOAuthGate = {
  disabled: boolean;
};

export type LoginCopy = {
  title: string;
  termsLabelPrefix: string;
  termsLinkLabel: string;
  termsPath: string;
};

export function normalizeTermsAccepted(checked: TermsCheckedState): boolean {
  return checked === true;
}

export function buildLoginOAuthGate({ termsAccepted }: { termsAccepted: boolean }): LoginOAuthGate {
  return {
    disabled: !termsAccepted,
  };
}

export function buildLoginCopy({ termsPath }: { termsPath: string }): LoginCopy {
  return {
    title: "Sign in",
    termsLabelPrefix: "I accept the",
    termsLinkLabel: "Terms and Privacy Notes",
    termsPath,
  };
}
