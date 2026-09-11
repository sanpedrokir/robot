// AWS Lambda (which powers Amplify's SSR hosting compute under the hood)
// always sets AWS_LAMBDA_FUNCTION_NAME in its runtime automatically, with no
// console configuration required. Anything that needs to launch a real
// headless Chrome (WhatsApp, the feedback-form submitter) can't work there —
// there's no bundled browser binary and no persistent filesystem across
// invocations — so this is used to auto-disable those features rather than
// depend on someone remembering to set a manual flag correctly.
export const isServerlessHosting = Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);
