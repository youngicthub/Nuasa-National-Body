import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import presidentPhoto from "@assets/president-daniel-temple.asset.json_1782102193392.jpg";

export const PresidentSection = () => {
  return (
    <section className="bg-card border-y border-border py-16 md:py-24">
      <div className="content-container">
        <div className="grid lg:grid-cols-[420px_1fr] gap-10 lg:gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative mx-auto lg:mx-0"
          >
            <div className="absolute -inset-4 bg-accent/20 rounded-3xl blur-2xl" aria-hidden />
            <div className="relative rounded-3xl overflow-hidden border-2 border-accent/40 shadow-2xl bg-muted aspect-[4/5] w-full max-w-[380px]">
              <img
                src={presidentPhoto}
                alt="Daniel O. Temple — NUASA National Executive President"
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <p className="text-xs uppercase tracking-[0.25em] text-accent font-semibold mb-3">
              Office of the President
            </p>
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-3">
              Daniel O. Temple, AAT
            </h2>
            <p className="text-lg text-muted-foreground mb-6">
              Executive President, NUASA National Body
            </p>
            <p className="text-base text-foreground/80 leading-relaxed mb-6 max-w-2xl">
              Leading a new chapter for accounting students across Nigeria — building a community
              that learns, networks and grows together. From the National E-Library to the annual
              convention, every initiative is shaped around your journey from classroom to chartered.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Link to="/executives" className="gap-2">
                  Meet the Executives <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/convention">Register for Convention</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
