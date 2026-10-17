import { prisma } from "@o-radar/db";
import { NextResponse } from "next/server";
import "../../../src/env";

export const dynamic = "force-dynamic";

export async function GET() {
  await prisma.$queryRaw`SELECT 1`;

  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
}