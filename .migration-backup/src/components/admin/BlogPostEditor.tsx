import { useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Quote,
  Link as LinkIcon,
  Image,
  Save,
  Eye,
  Send,
  Loader2,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

interface BlogPost {
  id?: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  cover_image: string;
  category_id: string;
  status: "draft" | "published";
  is_featured: boolean;
  read_time: number;
}

interface BlogPostEditorProps {
  post?: BlogPost;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const generateSlug = (title: string) => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
};

const estimateReadTime = (content: string) => {
  const wordsPerMinute = 200;
  const wordCount = content.split(/\s+/).length;
  return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
};

export function BlogPostEditor({ post, onSuccess, onCancel }: BlogPostEditorProps) {
  const { user } = useAuth();
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [formData, setFormData] = useState<BlogPost>({
    title: post?.title || "",
    slug: post?.slug || "",
    content: post?.content || "",
    excerpt: post?.excerpt || "",
    cover_image: post?.cover_image || "",
    category_id: post?.category_id || "",
    status: post?.status || "draft",
    is_featured: post?.is_featured || false,
    read_time: post?.read_time || 5,
    ...post,
  });

  const { data: categories } = useQuery({
    queryKey: ["categories-blog"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .in("type", ["blog", "both"])
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: tags } = useQuery({
    queryKey: ["tags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tags")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const handleTitleChange = (title: string) => {
    setFormData({
      ...formData,
      title,
      slug: formData.slug || generateSlug(title),
    });
  };

  const handleContentChange = (content: string) => {
    setFormData({
      ...formData,
      content,
      read_time: estimateReadTime(content),
    });
  };

  const insertFormat = (before: string, after: string = before) => {
    const textarea = contentRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = formData.content.substring(start, end);
    const newContent =
      formData.content.substring(0, start) +
      before +
      selectedText +
      after +
      formData.content.substring(end);

    handleContentChange(newContent);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, end + before.length);
    }, 0);
  };

  const handleSave = async (publish: boolean = false) => {
    if (!user) return;

    setIsSaving(true);
    try {
      const postData = {
        title: formData.title,
        slug: formData.slug || generateSlug(formData.title),
        content: formData.content,
        excerpt: formData.excerpt || formData.content.substring(0, 150) + "...",
        cover_image: formData.cover_image || null,
        category_id: formData.category_id || null,
        author_id: user.id,
        status: publish ? "published" : formData.status,
        is_featured: formData.is_featured,
        read_time: formData.read_time,
        published_at: publish ? new Date().toISOString() : null,
      };

      let postId = post?.id;

      if (postId) {
        // Update existing post
        const { error } = await supabase
          .from("blog_posts")
          .update(postData)
          .eq("id", postId);
        if (error) throw error;
      } else {
        // Create new post
        const { data, error } = await supabase
          .from("blog_posts")
          .insert(postData)
          .select("id")
          .single();
        if (error) throw error;
        postId = data.id;
      }

      // Handle tags
      if (postId && selectedTags.length > 0) {
        // Delete existing tags
        await supabase
          .from("blog_post_tags")
          .delete()
          .eq("post_id", postId);

        // Insert new tags
        const tagInserts = selectedTags.map((tagId) => ({
          post_id: postId,
          tag_id: tagId,
        }));
        await supabase.from("blog_post_tags").insert(tagInserts);
      }

      toast.success(publish ? "Post published!" : "Post saved as draft");
      onSuccess?.();
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save post");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleTag = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
  };

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Main Editor */}
      <div className="lg:col-span-2 space-y-6">
        {/* Title */}
        <div className="space-y-2">
          <Input
            value={formData.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Post title..."
            className="text-2xl font-serif font-bold border-0 border-b rounded-none px-0 focus-visible:ring-0"
          />
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap gap-1 p-2 bg-muted rounded-lg">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => insertFormat("**")}
            title="Bold"
          >
            <Bold className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => insertFormat("*")}
            title="Italic"
          >
            <Italic className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => insertFormat("<u>", "</u>")}
            title="Underline"
          >
            <Underline className="w-4 h-4" />
          </Button>
          <Separator orientation="vertical" className="h-8 mx-1" />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => insertFormat("\n## ", "\n")}
            title="Heading 1"
          >
            <Heading1 className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => insertFormat("\n### ", "\n")}
            title="Heading 2"
          >
            <Heading2 className="w-4 h-4" />
          </Button>
          <Separator orientation="vertical" className="h-8 mx-1" />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => insertFormat("\n- ")}
            title="Bullet List"
          >
            <List className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => insertFormat("\n1. ")}
            title="Numbered List"
          >
            <ListOrdered className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => insertFormat("\n> ", "\n")}
            title="Quote"
          >
            <Quote className="w-4 h-4" />
          </Button>
          <Separator orientation="vertical" className="h-8 mx-1" />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => insertFormat("[", "](url)")}
            title="Link"
          >
            <LinkIcon className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => insertFormat("![alt](", ")")}
            title="Image"
          >
            <Image className="w-4 h-4" />
          </Button>
        </div>

        {/* Content Editor */}
        <Textarea
          ref={contentRef}
          value={formData.content}
          onChange={(e) => handleContentChange(e.target.value)}
          placeholder="Write your blog post content here... (Markdown supported)"
          className="min-h-[400px] font-mono text-sm resize-y"
        />

        {/* Excerpt */}
        <div className="space-y-2">
          <Label htmlFor="excerpt">Excerpt</Label>
          <Textarea
            id="excerpt"
            value={formData.excerpt}
            onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
            placeholder="Brief summary of the post (auto-generated if left empty)"
            rows={3}
          />
        </div>
      </div>

      {/* Sidebar Settings */}
      <div className="space-y-6">
        {/* Actions */}
        <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
          <h3 className="font-semibold text-foreground">Publish</h3>
          <div className="flex flex-col gap-2">
            <Button
              onClick={() => handleSave(false)}
              variant="outline"
              className="w-full gap-2"
              disabled={isSaving || !formData.title}
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Draft
            </Button>
            <Button
              onClick={() => handleSave(true)}
              className="w-full gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
              disabled={isSaving || !formData.title || !formData.content}
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Publish
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Est. read time: {formData.read_time} min
          </p>
        </div>

        {/* Category */}
        <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
          <h3 className="font-semibold text-foreground">Category</h3>
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

        {/* Tags */}
        <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
          <h3 className="font-semibold text-foreground">Tags</h3>
          <div className="flex flex-wrap gap-2">
            {tags?.map((tag) => (
              <Badge
                key={tag.id}
                variant={selectedTags.includes(tag.id) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => toggleTag(tag.id)}
              >
                {tag.name}
                {selectedTags.includes(tag.id) && (
                  <X className="w-3 h-3 ml-1" />
                )}
              </Badge>
            ))}
          </div>
        </div>

        {/* Settings */}
        <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
          <h3 className="font-semibold text-foreground">Settings</h3>
          
          <div className="space-y-2">
            <Label htmlFor="slug">URL Slug</Label>
            <Input
              id="slug"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              placeholder="post-url-slug"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cover_image">Cover Image URL</Label>
            <Input
              id="cover_image"
              value={formData.cover_image}
              onChange={(e) => setFormData({ ...formData, cover_image: e.target.value })}
              placeholder="https://..."
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <Label htmlFor="is_featured">Featured Post</Label>
            <Switch
              id="is_featured"
              checked={formData.is_featured}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, is_featured: checked })
              }
            />
          </div>
        </div>

        {onCancel && (
          <Button variant="ghost" className="w-full" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}
