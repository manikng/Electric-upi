import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_PREFIXES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const BUCKET = "charger-images";

// ── POST /api/upload ──
// Accepts multipart/form-data with a "file" field.
// Returns { url: string } or { error: string }.
export async function POST(request: Request) {
  try {
    // 1. Auth guard
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
    }

    // 2. Parse multipart form
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json({ error: "Invalid request — expected multipart/form-data." }, { status: 400 });
    }

    const file = formData.get("file");

    // 3. Validate: file present
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file provided. Include a 'file' field." }, { status: 400 });
    }

    // 4. Validate: MIME type (invariant — adversarial case: user uploads .exe)
    const mime = file.type;
    if (!ALLOWED_MIME_PREFIXES.some((allowed) => mime.startsWith(allowed))) {
      return NextResponse.json(
        { error: `File type '${mime}' is not allowed. Upload a JPEG, PNG, WebP, or GIF image.` },
        { status: 400 }
      );
    }

    // 5. Validate: file size (invariant — adversarial case: 50 MB bomb)
    if (file.size > MAX_SIZE_BYTES) {
      const sizeMB = (file.size / 1024 / 1024).toFixed(1);
      return NextResponse.json(
        { error: `File is ${sizeMB} MB. Maximum allowed size is 5 MB.` },
        { status: 400 }
      );
    }

    // 6. Build a unique storage path: {userId}/{timestamp}-{sanitized-filename}
    const ext = mime.split("/")[1] || "jpg";
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 60);
    const storagePath = `${user.id}/${Date.now()}-${safeName}`;

    // 7. Convert File to ArrayBuffer for Supabase upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // 8. Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, buffer, {
        contentType: mime,
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("Supabase Storage upload error:", uploadError);
      // Return the specific error message to help the developer configure policies
      return NextResponse.json(
        { error: `Image upload failed: ${uploadError.message || "Unknown error"}. Hint: Make sure the 'charger-images' bucket is created in Supabase Storage and RLS policies are added to allow writes.` },
        { status: 503 }
      );
    }

    // 9. Get public URL
    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

    if (!urlData?.publicUrl) {
      return NextResponse.json(
        { error: "Uploaded but could not retrieve image URL. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: urlData.publicUrl }, { status: 200 });
  } catch (error) {
    console.error("POST /api/upload unhandled error:", error);
    return NextResponse.json({ error: "Internal server error during upload." }, { status: 500 });
  }
}
