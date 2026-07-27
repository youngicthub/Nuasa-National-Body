import { useState, useRef } from "react";
import { Upload, X, Loader2, Check, ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

interface ChapterUploadFormProps {
  onSuccess?: () => void;
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export function ChapterUploadForm({ onSuccess }: ChapterUploadFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    university: "",
    description: "",
    location: "",
    established_year: "",
    member_count: "",
    contact_email: "",
    is_active: true,
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be less than 10MB");
      return;
    }
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
    const lowerName = file.name.toLowerCase();
    const isHeic = lowerName.endsWith(".heic") || lowerName.endsWith(".heif") || file.type === "image/heic" || file.type === "image/heif";
    if (isHeic) {
      toast.error("HEIC/HEIF images are not supported by web browsers. Please convert to JPG or PNG first.");
      return;
    }
    if (!allowedTypes.includes(file.type)) {
      toast.error("Please use a JPG, PNG, WebP or GIF image");
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.university) {
      toast.error("Chapter name and university are required");
      return;
    }
    setIsSubmitting(true);
    try {
      let group_picture_url: string | null = null;

      if (imageFile) {
        const ext = imageFile.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("chapter-images")
          .upload(fileName, imageFile);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage
          .from("chapter-images")
          .getPublicUrl(fileName);
        group_picture_url = urlData.publicUrl;
      }

      const slug = `${slugify(formData.name)}-${slugify(formData.university)}`;

      const { error: insertError } = await supabase.from("chapters").insert({
        name: formData.name,
        university: formData.university,
        slug,
        description: formData.description || null,
        location: formData.location || null,
        established_year: formData.established_year ? parseInt(formData.established_year) : null,
        member_count: formData.member_count ? parseInt(formData.member_count) : 0,
        contact_email: formData.contact_email || null,
        group_picture_url,
        is_active: formData.is_active,
      });

      if (insertError) throw insertError;

      toast.success("Chapter added successfully!");
      setImageFile(null);
      setImagePreview(null);
      setFormData({
        name: "",
        university: "",
        description: "",
        location: "",
        established_year: "",
        member_count: "",
        contact_email: "",
        is_active: true,
      });
      onSuccess?.();
    } catch (error) {
      console.error("Chapter upload error:", error);
      const msg = error instanceof Error ? error.message : "Failed to add chapter";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-colors ${
          imagePreview ? "border-success bg-success/5" : "border-border hover:border-accent hover:bg-accent/5"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
          onChange={handleImageChange}
          className="hidden"
        />
        {imagePreview ? (
          <div className="relative">
            <img
              src={imagePreview}
              alt="Chapter preview"
              className="max-h-64 mx-auto rounded-lg object-cover"
            />
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="absolute top-2 right-2"
              onClick={(e) => {
                e.stopPropagation();
                setImageFile(null);
                setImagePreview(null);
              }}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <>
            <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium text-foreground mb-1">
              Upload chapter group picture
            </p>
            <p className="text-sm text-muted-foreground">
              JPG, PNG or WEBP (max 10MB)
            </p>
          </>
        )}
      </div>

      <div className="grid gap-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Chapter Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., NUASA UNILAG Chapter"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="university">University *</Label>
            <Input
              id="university"
              value={formData.university}
              onChange={(e) => setFormData({ ...formData, university: e.target.value })}
              placeholder="e.g., University of Lagos"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Brief description of this chapter..."
            rows={3}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="e.g., Lagos, Nigeria"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="established_year">Established Year</Label>
            <Input
              id="established_year"
              type="number"
              min="1900"
              max={new Date().getFullYear()}
              value={formData.established_year}
              onChange={(e) => setFormData({ ...formData, established_year: e.target.value })}
              placeholder="e.g., 2010"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="member_count">Member Count</Label>
            <Input
              id="member_count"
              type="number"
              min="0"
              value={formData.member_count}
              onChange={(e) => setFormData({ ...formData, member_count: e.target.value })}
              placeholder="e.g., 250"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact_email">Contact Email</Label>
            <Input
              id="contact_email"
              type="email"
              value={formData.contact_email}
              onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
              placeholder="chapter@example.com"
            />
          </div>
        </div>

        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div>
            <Label htmlFor="is_active" className="font-medium">Active</Label>
            <p className="text-sm text-muted-foreground">
              Show this chapter on the public Chapters page
            </p>
          </div>
          <Switch
            id="is_active"
            checked={formData.is_active}
            onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
          />
        </div>
      </div>

      <Button
        type="submit"
        className="w-full gap-2"
        disabled={isSubmitting || !formData.name || !formData.university}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Check className="w-4 h-4" />
            Save Chapter
          </>
        )}
      </Button>
    </form>
  );
}
