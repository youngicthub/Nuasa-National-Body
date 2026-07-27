import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, MapPin, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { format } from "date-fns";

const Events = () => {
  const { data: events, isLoading } = useQuery({
    queryKey: ["events"],
    queryFn: () => apiFetch<any[]>("/events"),
  });

  const now = new Date();
  const upcoming = (events || [])
    .filter((e) => new Date(e.end_time || e.start_time) >= now)
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  const past = (events || []).filter((e) => new Date(e.end_time || e.start_time) < now);

  const renderList = (list: typeof events) => {
    if (!list || list.length === 0) {
      return (
        <div className="text-center py-16 text-muted-foreground">
          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>No events to show.</p>
        </div>
      );
    }
    return (
      <div className="grid md:grid-cols-2 gap-6">
        {list.map((e, i) => (
          <motion.article
            key={e.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-card border border-border rounded-2xl overflow-hidden hover:border-accent transition-colors"
          >
            {e.cover_image && (
              <img src={e.cover_image} alt={e.title} className="w-full h-48 object-cover" />
            )}
            <div className="p-6">
              <h2 className="font-serif text-xl font-bold text-foreground mb-2">{e.title}</h2>
              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mb-3">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  {format(new Date(e.start_time), "PPP p")}
                </span>
                {e.location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" />
                    {e.location}
                  </span>
                )}
              </div>
              {e.description && (
                <p className="text-sm text-foreground/80 mb-4 line-clamp-3">{e.description}</p>
              )}
              {e.link && (
                <Button asChild variant="outline" size="sm">
                  <a
                    href={e.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Learn more about ${e.title}`}
                    className="gap-2"
                  >
                    Learn more about {e.title} <ExternalLink className="w-3 h-3" />
                  </a>
                </Button>
              )}
            </div>
          </motion.article>
        ))}
      </div>
    );
  };

  return (
    <Layout>
      <SEO
        title="Events — NUASA National Body"
        description="Upcoming and past NUASA conferences, workshops, and chapter activities for accounting students across Nigeria."
        path="/events"
      />
      <section className="content-container py-12 md:py-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <h1 className="font-serif text-4xl md:text-5xl font-bold text-foreground mb-3">
            NUASA Events
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl">
            Stay updated with our upcoming conferences, workshops, and chapter activities — and revisit past highlights.
          </p>
        </motion.div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
          </div>
        ) : (
          <Tabs defaultValue="upcoming" className="space-y-6">
            <TabsList>
              <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
              <TabsTrigger value="past">Past ({past.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="upcoming">{renderList(upcoming)}</TabsContent>
            <TabsContent value="past">{renderList(past)}</TabsContent>
          </Tabs>
        )}
      </section>
    </Layout>
  );
};

export default Events;
