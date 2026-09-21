"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export interface AuthResponse {
  success?: boolean;
  error?: string;
  message?: string;
}

export async function loginAction(formData: FormData): Promise<AuthResponse> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Please enter both your email and password." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  if (data.user?.email) {
    const existing = await prisma.user.findFirst({
      where: { email: data.user.email },
    });

    if (!existing) {
      await prisma.user.create({
        data: {
          id: data.user.id,
          email: data.user.email,
          name: data.user.user_metadata?.full_name || email.split("@")[0],
          role: "CUSTOMER",
        },
      });
    }
  }

  const returnTo = (formData.get("returnTo") as string) || "/account";
  redirect(returnTo);
}

export async function signupAction(formData: FormData): Promise<AuthResponse> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const name = formData.get("name") as string;

  if (!email || !password) {
    return { error: "Please provide both an email and password." };
  }

  if (password.length < 6) {
    return { error: "Password must be at least 6 characters long." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: name || email.split("@")[0],
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data.user?.email) {
    const existing = await prisma.user.findFirst({
      where: { email: data.user.email },
    });

    if (!existing) {
      await prisma.user.create({
        data: {
          id: data.user.id,
          email: data.user.email,
          name: name || email.split("@")[0],
          role: "CUSTOMER",
        },
      });
    }
  }

  if (data.session) {
    redirect("/account");
  }

  return {
    success: true,
    message: "Registration signal dispatched. Please verify your email or sign in.",
  };
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return null;

  const dbUser = await prisma.user.findFirst({
    where: { email: user.email },
    include: {
      addresses: true,
      orders: {
        include: {
          items: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  return {
    authUser: user,
    dbUser,
  };
}
