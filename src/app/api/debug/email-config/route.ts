import { NextResponse } from "next/server";
import { getEmailConfig, getDefaultEmailConfig } from "@/lib/email";

export async function GET() {
  const defaultConfig = getDefaultEmailConfig();
  const userConfig = await getEmailConfig("0b53ca66-8e12-4f37-9a05-5ea9340614f7");

  return NextResponse.json({
    default: {
      host: defaultConfig.host,
      user: defaultConfig.user,
      pass_set: !!defaultConfig.pass,
      pass_length: defaultConfig.pass?.length || 0,
    },
    user: userConfig ? {
      host: userConfig.host,
      user: userConfig.user,
      pass_set: !!userConfig.pass,
      pass_length: userConfig.pass?.length || 0,
    } : null,
    env: {
      gmail_app_password_set: !!process.env.GMAIL_APP_PASSWORD,
      gmail_app_password_length: process.env.GMAIL_APP_PASSWORD?.length || 0,
    }
  });
}
