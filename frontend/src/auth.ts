import { Amplify } from 'aws-amplify';
import {
  confirmSignUp,
  fetchAuthSession,
  getCurrentUser,
  signIn,
  signOut,
  signUp,
} from 'aws-amplify/auth';

const region = import.meta.env.VITE_AWS_REGION;
const userPoolId = import.meta.env.VITE_COGNITO_USER_POOL_ID;
const userPoolClientId = import.meta.env.VITE_COGNITO_CLIENT_ID;

export const cloudAuthEnabled = Boolean(region && userPoolId && userPoolClientId);

if (cloudAuthEnabled) {
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId,
        userPoolClientId,
        loginWith: { email: true },
      },
    },
  });
}

export async function authenticate(email: string, password: string) {
  if (!cloudAuthEnabled) return { username: email };
  await signIn({ username: email, password, options: { authFlowType: 'USER_PASSWORD_AUTH' } });
  const user = await getCurrentUser();
  return { username: user.username };
}

export async function register(email: string, password: string): Promise<'CONFIRM' | 'DONE'> {
  if (!cloudAuthEnabled) return 'DONE';
  const result = await signUp({ username: email, password, options: { userAttributes: { email } } });
  return 'signUpStep' in result.nextStep && result.nextStep.signUpStep === 'CONFIRM_SIGN_UP' ? 'CONFIRM' : 'DONE';
}

export async function confirmRegistration(email: string, code: string) {
  if (!cloudAuthEnabled) return;
  await confirmSignUp({ username: email, confirmationCode: code });
}

export async function getIdToken() {
  if (!cloudAuthEnabled) return null;
  const session = await fetchAuthSession();
  return session.tokens?.idToken?.toString() ?? null;
}

export async function endSession() {
  if (cloudAuthEnabled) await signOut();
}
