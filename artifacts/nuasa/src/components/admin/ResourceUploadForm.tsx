import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Upload, FileText, X, Loader2, Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { ImageUpload } from "./ImageUpload";

interface ResourceUploadFormProps {
  onSuccess?: () => void;
}

export function ResourceUploadForm({ onSuccess }: ResourceUploadFormProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category_id: "",
    course: "",
    level: "",
    cover_image: "",
    is_public: false,
    is_featured: false,
  });

  const { data: categories } = useQuery({
    queryKey: ["categories-library"],
    queryFn: async () => {
      const res = await apiFetch<{ data: any[] }>("/data/categories?order=name");
      return (res.data ?? []).filter(
        (c: any) => c.type === "library" || c.type === "both"
      );
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 50 * 1024 * 1024) {
        toast.error("File size must be less than 50MB");
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !user) return;

    setIsUploading(true);
    try {
      // Upload the resource file via /api/uploads
      const fileBody = new FormData();
      fileBody.append("file", file);
      const { publicUrl: fileUrl } = await apiFetch<{ path: string; publicUrl: string }>("/uploads", {
        method: "POST",
        body: fileBody,
      });

      // Insert resource record
      const fileExt = file.name.split(".").pop() ?? "";
      const res = await apiFetch<{ data: any; error: any }>("/data/library_resources", {
        method: "POST",
        body: JSON.stringify({
          title: formData.title,
          description: formData.description || null,
          file_url: fileUrl,
          file_name: file.name,
          file_size: file.size,
          file_type: file.type || fileExt,
          cover_image: formData.cover_image || null,
          category_id: formData.category_id || null,
          author_id: user.id,
          course: formData.course || null,
          level: formData.level || null,
          is_public: formData.is_public,
          is_featured: formData.is_featured,
          download_count: 0,
          view_count: 0,
        }),
      });

      if (res.error) throw new Error(res.error.message || "Failed to save resource");

      toast.success("Resource uploaded successfully!");
      setFile(null);
      setFormData({
        title: "",
        description: "",
        category_id: "",
        course: "",
        level: "",
        cover_image: "",
        is_public: false,
        is_featured: false,
      });
      onSuccess?.();
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error?.message || "Failed to upload resource");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Resource File Upload Area */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors
          ${file ? "border-success bg-success/5" : "border-border hover:border-accent hover:bg-accent/5"}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx"
          onChange={handleFileChange}
          className="hidden"
        />
        {file ? (
          <div className="flex items-center justify-center gap-3">
            <FileText className="w-8 h-8 text-success" />
            <div className="text-left">
              <p className="font-medium text-foreground">{file.name}</p>
              <p className="text-sm text-muted-foreground">
                {(file.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                setFile(null);
              }}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <>
            <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="font-medium text-foreground mb-1">
              Drop a file here or click to browse
            </p>
            <p className="text-sm text-muted-foreground">
              PDF, Word, PowerPoint, Excel (max 50MB)
            </p>
          </>
        )}
      </div>

      {/* Form Fields */}
      <div className="grid gap-4">
        <div className="space-y-2">
          <Label htmlFor="title">Title *</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Resource title"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Brief description of the resource..."
            rows={3}
          />
        </div>

        {/* Cover Image */}
        <ImageUpload
          label="Cover Image (optional)"
          value={formData.cover_image}
          onChange={(url) => setFormData({ ...formData, cover_image: url })}
        />

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select
              value={formData.category_id}
              onValueChange={(value) => setFormData({ ...formData, category_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories?.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="level">Level</Label>
            <Select
              value={formData.level}
              onValueChange={(value) => setFormData({ ...formData, level: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="course">Course (Optional)</Label>
          <Input
            id="course"
            value={formData.course}
            onChange={(e) => setFormData({ ...formData, course: e.target.value })}
            placeholder="e.g., MTH 201"
          />
        </div>

        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div>
            <Label htmlFor="is_public" className="font-medium">Public Access</Label>
            <p className="text-sm text-muted-foreground">
              Allow non-logged in users to view
            </p>
          </div>
          <Switch
            id="is_public"
            checked={formData.is_public}
            onCheckedChange={(checked) => setFormData({ ...formData, is_public: checked })}
          />
        </div>

        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div>
            <Label htmlFor="is_featured" className="font-medium">Featured Resource</Label>
            <p className="text-sm text-muted-foreground">
              Show on homepage featured section
            </p>
          </div>
          <Switch
            id="is_featured"
            checked={formData.is_featured}
            onCheckedChange={(checked) => setFormData({ ...formData, is_featured: checked })}
          />
        </div>
      </div>

      <Button
        type="submit"
        className="w-full gap-2"
        disabled={!file || !formData.title || isUploading}
      >
        {isUploading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <Check className="w-4 h-4" />
            Upload Resource
          </>
        )}
      </Button>
    </form>
  );
}
