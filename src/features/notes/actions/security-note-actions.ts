"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { upsertSecurityNote } from "@/features/notes/server/security-note-service";

export type SecurityNoteActionState = {
  success: boolean;
  message: string;
  savedNote?: {
    id: string;
    securityId: string;
    title: string;
    body: string;
    createdAt: string;
    updatedAt: string;
  };
};

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function upsertSecurityNoteAction(
  _prevState: SecurityNoteActionState,
  formData: FormData,
): Promise<SecurityNoteActionState> {
  try {
    if (!process.env.DATABASE_URL) {
      return {
        success: false,
        message: "DATABASE_URL is required before saving memos.",
      };
    }

    const session = await getServerSession(authOptions);
    const securityId = getString(formData, "securityId");
    const noteId = getString(formData, "noteId");
    const title = getString(formData, "title");
    const body = getString(formData, "body");

    if (!securityId) {
      return {
        success: false,
        message: "Security is required.",
      };
    }

    if (!title) {
      return {
        success: false,
        message: "Memo title is required.",
      };
    }

    if (!body) {
      return {
        success: false,
        message: "Analyzed content is required.",
      };
    }

    const savedNote = await upsertSecurityNote({
      userId: session?.user?.id ?? null,
      securityId,
      noteId: noteId || undefined,
      title,
      body,
    });

    revalidatePath("/");

    return {
      success: true,
      message: noteId ? "Memo updated." : "Memo saved.",
      savedNote: {
        id: savedNote.id,
        securityId: savedNote.securityId,
        title: savedNote.title,
        body: savedNote.body,
        createdAt: savedNote.createdAt.toISOString(),
        updatedAt: savedNote.updatedAt.toISOString(),
      },
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to save memo.",
    };
  }
}
