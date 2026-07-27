import { motion } from "framer-motion";
import { MapPin, Users, Calendar, Mail, Loader2, Building2 } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useState } from "react";
import { Search } from "lucide-react";

const Chapters = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: chapters, isLoading } = useQuery({
    queryKey: ["chapters"],
    queryFn: () => apiFetch<any[]>("/chapters"),
  });

  const filtered = (chapters || []).filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.university.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.location || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Layout>
      <SEO
        title="NUASA Chapters — Universities Across Nigeria"
        description="Meet NUASA chapters at universities nationwide. Connect with student leaders shaping the future of accounting in Nigeria."
        path="/chapters"
      />
      <section className="bg-primary py-16 md:py-24">
        <div className="content-container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl"
          >
            <Badge variant="secondary" className="mb-4">Our Network</Badge>
            <h1 className="font-serif text-4xl md:text-5xl font-bold text-primary-foreground mb-4">
              NUASA Chapters
            </h1>
            <p className="text-lg text-primary-foreground/80 mb-8">
              Meet our chapters across universities nationwide. Each chapter brings together
              passionate students working to shape the future of accounting in Nigeria.
            </p>
            <div className="relative max-w-xl">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by chapter name, university, or location..."
                className="pl-12 h-12 bg-card"
              />
            </div>
          </motion.div>
        </div>
      </section>

      <section className="section-padding bg-background">
        <div className="content-container">
          {isLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-10 h-10 animate-spin text-accent" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <Building2 className="w-16 h-16 mx-auto text-muted-foreground/40 mb-4" />
              <h2 className="font-serif text-xl font-bold text-foreground mb-2">
                {chapters && chapters.length > 0 ? "No chapters match your search" : "No chapters yet"}
              </h2>
              <p className="text-muted-foreground">
                {chapters && chapters.length > 0
                  ? "Try a different search term."
                  : "Chapter information will be added soon."}
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filtered.map((chapter, index) => (
                <motion.div
                  key={chapter.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-card rounded-2xl border border-border overflow-hidden card-hover group"
                >
                  <div className="aspect-[4/3] bg-gradient-to-br from-primary to-primary/70 overflow-hidden relative">
                    {chapter.group_picture_url ? (
                      <img
                        src={chapter.group_picture_url}
                        alt={`${chapter.name} group photo`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                        onError={(e) => {
                          const target = e.currentTarget;
                          target.style.display = "none";
                          const fallback = target.nextElementSibling as HTMLElement | null;
                          if (fallback) fallback.style.display = "flex";
                        }}
                      />
                    ) : null}
                    <div
                      className="w-full h-full items-center justify-center absolute inset-0"
                      style={{ display: chapter.group_picture_url ? "none" : "flex" }}
                    >
                      <Building2 className="w-16 h-16 text-primary-foreground/30" />
                    </div>
                  </div>
                  <div className="p-6">
                    <h2 className="font-serif text-xl font-bold text-foreground mb-1">
                      {chapter.name}
                    </h2>
                    <p className="text-sm text-accent font-medium mb-3">
                      {chapter.university}
                    </p>
                    {chapter.description && (
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                        {chapter.description}
                      </p>
                    )}
                    <div className="space-y-2 text-sm text-muted-foreground">
                      {chapter.location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-accent shrink-0" />
                          <span>{chapter.location}</span>
                        </div>
                      )}
                      {chapter.established_year && (
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-accent shrink-0" />
                          <span>Est. {chapter.established_year}</span>
                        </div>
                      )}
                      {chapter.member_count > 0 && (
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-accent shrink-0" />
                          <span>{chapter.member_count.toLocaleString()} members</span>
                        </div>
                      )}
                      {chapter.contact_email && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-accent shrink-0" />
                          <a
                            href={`mailto:${chapter.contact_email}`}
                            className="hover:text-accent transition-colors truncate"
                          >
                            {chapter.contact_email}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default Chapters;
