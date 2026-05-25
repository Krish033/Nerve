'use server';

import { cookies } from 'next/headers';

export async function setRefreshTokenCookie(token: string) {

  console.log("token ---------------------------", token);


  const cookieStore = await cookies();
  cookieStore.set('refreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });
}

export async function clearRefreshTokenCookie() {
  const cookieStore = await cookies();
  cookieStore.delete('refreshToken');
}
