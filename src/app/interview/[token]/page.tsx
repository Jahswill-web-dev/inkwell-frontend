import type { Metadata } from "next";
import { ClientInterview } from "@/components/interview/client-interview";

export const metadata: Metadata = {
  title: "Client interview",
  description: "Share your expertise through a focused Inkwell interview.",
};

export default async function ClientInterviewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <ClientInterview token={token} />;
}
