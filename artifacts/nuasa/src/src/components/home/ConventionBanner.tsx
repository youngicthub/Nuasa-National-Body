import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Calendar, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export const ConventionBanner = () => {
  return (
    <section className="bg-primary text-primary-foreground py-12 border-y border-accent/20">
      <div className="content-container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6"
        >
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/15 border border-accent/40 text-accent text-[11px] tracking-[0.25em] uppercase font-medium mb-3">
              <Sparkles className="w-3 h-3" /> Coming Soon
            </div>
            <h2 className="font-serif text-3xl md:text-4xl font-bold mb-2">NUASA National Convention</h2>
            <p className="text-primary-foreground/80 max-w-2xl text-sm md:text-base">
              The flagship gathering of accounting students across Nigeria. Network with peers,
              learn from industry leaders, and celebrate our community. Open to students,
              graduates, and chapter delegations nationwide.
            </p>
            <div className="flex items-center gap-2 mt-3 text-xs text-primary-foreground/70">
              <Calendar className="w-3.5 h-3.5 text-accent" /> Dates and venue to be announced
            </div>
          </div>
          <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2 shrink-0">
            <Link to="/convention">
              Register for Convention <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
};