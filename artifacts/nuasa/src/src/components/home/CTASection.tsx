import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export const CTASection = () => {
  return (
    <section className="section-padding bg-primary relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 bg-grid-pattern opacity-30" />
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-accent/5 rounded-full blur-3xl" />
      </div>
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
      <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />

      <div className="content-container relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto text-center text-primary-foreground"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/30 text-accent text-xs tracking-[0.25em] uppercase font-medium mb-6 backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5" />
            Join the Community
          </div>

          <h2 className="font-serif text-3xl md:text-5xl lg:text-6xl font-bold mb-6 leading-[1.1] text-balance">
            Ready to Transform Your
            <span className="text-gradient italic"> Academic Journey?</span>
          </h2>

          <p className="text-lg opacity-90 mb-8 max-w-2xl mx-auto">
            Join thousands of Nigerian students already benefiting from our comprehensive 
            e-library and educational resources. Free for all NUASA members.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Button
              asChild
              size="lg"
              className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2"
            >
              <Link to="/register">
                Create Free Account
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-primary-foreground/30 bg-black/40 text-primary-foreground hover:bg-transparent"
            >
              <Link to="/library">Browse Resources</Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
