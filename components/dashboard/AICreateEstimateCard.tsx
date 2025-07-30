import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Bot,
  Camera,
  Mail,
  Mic,
  Calculator,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { motion } from "framer-motion";

interface AICreateEstimateCardProps {
  navigateTo: (path: string) => void;
}

export const AICreateEstimateCard: React.FC<AICreateEstimateCardProps> = ({
  navigateTo,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mb-6 relative"
    >
      {/* Background mesh gradient effect */}
      <div className="absolute inset-0 bg-gradient-mesh opacity-30 blur-3xl -z-10" />

      <Card className="relative overflow-hidden border-2 border-accent-sand/20 bg-gradient-to-br from-bg-elevated via-bg-base to-accent-sand/5 shadow-xl hover:shadow-2xl transition-all duration-300 card-lift">
        {/* Animated gradient overlay */}
        <div className="absolute inset-0 bg-gradient-primary opacity-5 animate-gradient-shift" />

        <CardContent className="p-8 relative z-10">
          <div className="text-center mb-8">
            {/* Animated icon with glow effect */}
            <motion.div
              animate={{
                rotate: [0, 5, -5, 0],
                scale: [1, 1.05, 1],
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="inline-block mb-4"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-primary-500 blur-xl opacity-50 animate-pulse-soft" />
                <Bot className="h-16 w-16 text-primary-600 relative z-10" />
                <Sparkles className="h-6 w-6 text-accent-sand absolute -top-2 -right-2 animate-bounce-subtle" />
              </div>
            </motion.div>

            <h2 className="text-3xl font-bold text-gradient mb-3">
              Create AI Estimate
            </h2>
            <p className="text-text-secondary mb-6 max-w-md mx-auto">
              Drop email, photos, or describe your project - AI does the rest
            </p>

            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                size="lg"
                className="bg-gradient-primary hover:shadow-accent text-white font-semibold px-8 py-6 text-lg rounded-xl transition-all duration-300 group"
                onClick={() => navigateTo("/estimates/new/guided")}
                ripple
                haptic
              >
                <Bot className="mr-2 h-5 w-5 group-hover:animate-bounce-subtle" />
                Start AI Estimation
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </motion.div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              {
                icon: Camera,
                label: "Photo Analysis",
                path: "/estimates/new/guided?start=photos",
                color: "primary",
              },
              {
                icon: Mail,
                label: "Email Parse",
                path: "/estimates/new/guided?start=email",
                color: "sand",
              },
              {
                icon: Mic,
                label: "Voice Input",
                path: "/estimates/new/guided?start=voice",
                color: "taupe",
              },
              {
                icon: Calculator,
                label: "Calculator",
                path: "/calculator",
                color: "primary",
              },
              {
                icon: Bot,
                label: "AI Assistant",
                path: "/ai-assistant",
                color: "sand",
                special: true,
              },
            ].map((item, index) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -4 }}
                className="group"
              >
                <Button
                  variant="outline"
                  className={`
                    h-auto p-4 flex-col relative overflow-hidden
                    border-2 transition-all duration-300
                    ${
                      item.special
                        ? "border-accent-sand/30 bg-gradient-to-br from-accent-sand/10 to-transparent hover:border-accent-sand hover:shadow-accent"
                        : "hover:border-primary-400 hover:shadow-primary"
                    }
                  `}
                  onClick={() => navigateTo(item.path)}
                >
                  {/* Gradient background on hover */}
                  <div className="absolute inset-0 bg-gradient-subtle opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                  <item.icon
                    className={`
                    h-6 w-6 mb-2 relative z-10 transition-all duration-300
                    ${item.special ? "text-accent-sand group-hover:scale-110" : "group-hover:text-primary-600 group-hover:scale-110"}
                  `}
                  />
                  <span className="text-xs font-medium relative z-10">
                    {item.label}
                  </span>

                  {item.special && (
                    <Sparkles className="h-3 w-3 text-accent-taupe absolute top-2 right-2 animate-pulse-soft" />
                  )}
                </Button>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
