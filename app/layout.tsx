import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "https";
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3002";
  const origin = `${protocol}://${host}`;
  const title = "厕所先知｜每天一猜";
  const description = "每天三选一，猜中开启虚拟奖品盲盒。";
  const image = new URL("/og.png", origin).toString();

  return {
    title,
    description,
    openGraph: { title, description, images: [{ url: image, width: 1536, height: 1024 }] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
