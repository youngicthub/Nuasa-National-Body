import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Loader2, Mail, Phone, User } from "lucide-react";
import { motion } from "framer-motion";
import presidentAsset from "@/assets/president-daniel-temple.asset.json";

type Executive = {
  id: string;
  full_name: string;
  position: string;
  bio: string | null;
  image_url: string | null;
  email: string | null;
  phone: string | null;
  sort_order: number;
  is_active: boolean;
};

const PRESIDENT: Executive = {
  id: "__president",
  full_name: "Daniel O. Temple, AAT",
  position: "Executive President",
  bio: "Leading the NUASA National Body — committed to building a thriving community of accounting students across Nigeria.",
  image_url: presidentAsset.url,
  email: null,
  phone: null,
  sort_order: -1,
  is_active: true,
};

const Executives = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["public-executives"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("executives")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) {
        console.warn("executives table not available yet", error.message);
        return [] as Executive[];
      }
      return (data || []) as Executive[];
    },
  });

  const list: Executive[] = [PRESIDENT, ...(data || [])];

  return (
    <Layout>
      <SEO
        title="NUASA National Executives"
        description="Meet the National Executives of the NUASA National Body — leaders driving the future of accounting students in Nigeria."
        path="/executives"
      />
      <section className="bg-primary text-primary-foreground py-16">
        <div className="content-container">
          <p className="text-xs uppercase tracking-[0.25em] text-accent font-semibold mb-3">
            Leadership
          </p>
          <h1 className="font-serif text-4xl md:text-5xl font-bold mb-3">
            National Executives
          </h1>
          <p className="text-primary-foreground/80 max-w-2xl">
            The team leading NUASA at the national level. Each executive serves the community
            with a clear portfolio and mandate.
          </p>
        </div>
      </section>

      <section className="content-container py-12">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {list.map((exec, i) => (
              <motion.div
                key={exec.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.04 }}
              >
                <Card className="overflow-hidden h-full flex flex-col">
                  <div className="aspect-[4/5] bg-muted relative overflow-hidden">
                    {exec.image_url ? (
                      <img
                        src={exec.image_url}
                        alt={`${exec.full_name} — ${exec.position}`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <User className="w-16 h-16" />
                      </div>
                    )}
                    {exec.id === "__president" && (
                      <span className="absolute top-3 left-3 bg-accent text-accent-foreground text-[10px] font-semibold uppercase tracking-widest px-2 py-1 rounded">
                        President
                      </span>
                    )}
                  </div>
                  <div className="p-5 flex-1 flex flex-col">
                    <h3 className="font-serif font-bold text-lg text-foreground">{exec.full_name}</h3>
                    <p className="text-sm text-accent font-medium mb-2">{exec.position}</p>
                    {exec.bio && (
                      <p className="text-sm text-muted-foreground line-clamp-4 mb-3">{exec.bio}</p>
                    )}
                    <div className="mt-auto space-y-1 text-xs text-muted-foreground">
                      {exec.email && (
                        <div className="flex items-center gap-2"><Mail className="w-3 h-3" /> {exec.email}</div>
                      )}
                      {exec.phone && (
                        <div className="flex items-center gap-2"><Phone className="w-3 h-3" /> {exec.phone}</div>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </section>
    </Layout>
  );
};

export default Executives;
