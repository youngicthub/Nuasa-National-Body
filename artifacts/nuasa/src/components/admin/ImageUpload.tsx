import { useRef, useState } from "react";
import { ImageIcon, Upload, X, Loader2, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
}

export function ImageUpload({ value, onChange, label = "Cover Image" }: ImageUploadProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [showUrl, setShowUrl] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"];
    if (!allowed.includes(file.type)) {
      toast.error("Only image files are allowed (JPG, PNG, GIF, WebP, SVG)");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be under 10 MB");
      return;
    }

    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const { publicUrl } = await apiFetch<{ path: string; publicUrl: string }>("/uploads", {
        method: "POST",
        body,
      });
      onChange(publicUrl);
      toast.success("Image uploaded");
    } catch (err: any) {
      toast.error(err?.message || "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">{label}</p>

      {/* Preview */}
      {value && (
        <div className="relative w-full rounded-lg overflow-hidden border border-border bg-muted/30 aspect-video">
          <img src={value} alt="Cover preview" className="w-full h-full object-cover" />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 w-7 h-7 rounded-full"
            onClick={() => onChange("")}
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}

      {/* Upload area */}
      {!value && (
        <div
          onClick={() => fileRef.current?.click()}
          className="w-full rounded-lg border-2 border-dashed border-border hover:border-accent hover:bg-accent/5 transition-colors cursor-pointer flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground"
        >
          {uploading ? (
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
          ) : (
            <>
              <ImageIcon className="w-8 h-8" />
              <p className="text-sm font-medium">Click to upload image</p>
              <p className="text-xs">JPG, PNG, GIF, WebP (max 10 MB)</p>
            </>
          )}
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
        disabled={uploading}
      />

      {/* Toggle URL input */}
      <button
        type="button"
        onClick={() => setShowUrl((v) => !v)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-accent transition-colors"
      >
        <LinkIcon className="w-3 h-3" />
        {showUrl ? "Hide URL field" : "Or paste an image URL"}
      </button>

      {showUrl && (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://example.com/image.jpg"
          className="text-sm"
        />
      )}
    </div>
  );
}
