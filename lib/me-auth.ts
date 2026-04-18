import 'server-only';
import {findUserByEmail, verifyPassword} from '@/lib/users';

export type AuthedUser = Awaited<ReturnType<typeof findUserByEmail>>;

export async function authenticateBody(body: {
  email?: string;
  password?: string;
}): Promise<
  | {ok: true; user: NonNullable<AuthedUser>}
  | {ok: false; status: number; error: string; message: string}
> {
  if (!body.email || !body.password) {
    return {
      ok: false,
      status: 400,
      error: 'bad_request',
      message: 'email + password required'
    };
  }
  const email = body.email.toLowerCase().trim();
  try {
    const user = await findUserByEmail(email);
    if (!user) {
      return {
        ok: false,
        status: 401,
        error: 'bad_credentials',
        message: 'Email ან პაროლი არასწორია'
      };
    }
    const ok = verifyPassword(body.password, user.password_hash, user.password_salt);
    if (!ok) {
      return {
        ok: false,
        status: 401,
        error: 'bad_credentials',
        message: 'Email ან პაროლი არასწორია'
      };
    }
    return {ok: true, user};
  } catch (e) {
    return {
      ok: false,
      status: 500,
      error: 'server',
      message: e instanceof Error ? e.message : 'error'
    };
  }
}
