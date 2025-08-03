"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowRight,
  ArrowLeft,
  Building2,
  User,
  Briefcase,
  Target,
  CheckCircle,
  Upload,
  Sparkles,
  Calculator,
  Bot,
  FileText,
  Camera,
  DollarSign,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { createClient } from "@/lib/supabase/client";

// Onboarding steps
const ONBOARDING_STEPS = [
  { id: "welcome", title: "Welcome", icon: Sparkles },
  { id: "profile", title: "Your Profile", icon: User },
  { id: "business", title: "Business Info", icon: Building2 },
  { id: "services", title: "Services", icon: Briefcase },
  { id: "features", title: "Key Features", icon: Target },
  { id: "complete", title: "Get Started", icon: CheckCircle },
];

// Service options
const SERVICE_OPTIONS = [
  { id: "WC", label: "Window Cleaning", icon: "🪟" },
  { id: "PW", label: "Pressure Washing", icon: "💦" },
  { id: "SW", label: "Soft Washing", icon: "🧽" },
  { id: "BR", label: "Biofilm Removal", icon: "🦠" },
  { id: "GR", label: "Glass Restoration", icon: "✨" },
  { id: "HD", label: "High Dusting", icon: "🏗️" },
  { id: "FC", label: "Final Clean", icon: "🏢" },
  { id: "GRC", label: "Granite Reconditioning", icon: "🪨" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Form data
  const [userData, setUserData] = useState({
    fullName: "",
    companyName: "",
    phoneNumber: "",
    businessType: "",
    selectedServices: [] as string[],
    averageProjectSize: "",
    monthlyEstimates: "",
    profileImage: null as File | null,
  });

  // Check if user needs onboarding
  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/auth/login");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", user.id)
      .single();

    if (profile?.onboarding_completed) {
      router.push("/dashboard");
    }
  };

  const handleNext = async () => {
    if (currentStep === ONBOARDING_STEPS.length - 1) {
      await completeOnboarding();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleServiceToggle = (serviceId: string) => {
    setUserData((prev) => ({
      ...prev,
      selectedServices: prev.selectedServices.includes(serviceId)
        ? prev.selectedServices.filter((id) => id !== serviceId)
        : [...prev.selectedServices, serviceId],
    }));
  };

  const completeOnboarding = async () => {
    setIsLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      // Update user profile
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: userData.fullName,
          company_name: userData.companyName,
          phone: userData.phoneNumber,
        })
        .eq("id", user.id);

      if (error) throw error;

      toast({
        title: "Welcome aboard! 🎉",
        description:
          "Your account is all set up. Let&apos;s create your first estimate!",
      });

      router.push("/dashboard");
    } catch (error) {
      console.error("Onboarding error:", error);
      toast({
        title: "Something went wrong",
        description: "Please try again or contact support",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (ONBOARDING_STEPS[currentStep].id) {
      case "welcome":
        return <WelcomeStep />;
      case "profile":
        return <ProfileStep userData={userData} setUserData={setUserData} />;
      case "business":
        return <BusinessStep userData={userData} setUserData={setUserData} />;
      case "services":
        return (
          <ServicesStep
            userData={userData}
            onServiceToggle={handleServiceToggle}
          />
        );
      case "features":
        return <FeaturesStep />;
      case "complete":
        return <CompleteStep userData={userData} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-bg-base via-bg-subtle to-bg-base">
      <div className="container max-w-4xl mx-auto px-4 py-8">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {ONBOARDING_STEPS.map((step, index) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.id}
                  className={`flex items-center ${
                    index < ONBOARDING_STEPS.length - 1 ? "flex-1" : ""
                  }`}
                >
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-full transition-all ${
                      index <= currentStep
                        ? "bg-accent-primary text-white"
                        : "bg-bg-subtle text-text-tertiary"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  {index < ONBOARDING_STEPS.length - 1 && (
                    <div
                      className={`flex-1 h-1 mx-2 transition-all ${
                        index < currentStep
                          ? "bg-accent-primary"
                          : "bg-border-primary"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
          <Progress
            value={(currentStep / (ONBOARDING_STEPS.length - 1)) * 100}
          />
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {renderStepContent()}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 0}
            className={currentStep === 0 ? "invisible" : ""}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          <Button onClick={handleNext} disabled={isLoading}>
            {currentStep === ONBOARDING_STEPS.length - 1 ? (
              <>
                Complete Setup
                <CheckCircle className="h-4 w-4 ml-2" />
              </>
            ) : (
              <>
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Step Components
function WelcomeStep() {
  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 p-4 bg-accent-primary/10 rounded-full w-fit">
          <Sparkles className="h-12 w-12 text-accent-primary" />
        </div>
        <CardTitle className="text-3xl">Welcome to EstimatePro!</CardTitle>
        <CardDescription className="text-lg">
          Let&apos;s get you set up in just a few minutes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-center text-text-secondary">
          EstimatePro helps building service contractors create professional
          estimates in minutes, not hours. With AI-powered features and smart
          workflows, you&apos;ll win more jobs and save valuable time.
        </p>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-bg-subtle rounded-lg">
            <Bot className="h-8 w-8 text-accent-primary mx-auto mb-2" />
            <p className="font-medium">AI-Powered</p>
            <p className="text-sm text-text-secondary">
              Smart suggestions and automation
            </p>
          </div>
          <div className="text-center p-4 bg-bg-subtle rounded-lg">
            <Calculator className="h-8 w-8 text-accent-primary mx-auto mb-2" />
            <p className="font-medium">11 Calculators</p>
            <p className="text-sm text-text-secondary">
              Service-specific pricing tools
            </p>
          </div>
          <div className="text-center p-4 bg-bg-subtle rounded-lg">
            <FileText className="h-8 w-8 text-accent-primary mx-auto mb-2" />
            <p className="font-medium">Pro Estimates</p>
            <p className="text-sm text-text-secondary">
              Beautiful, winning proposals
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ProfileStep({ userData, setUserData }: any) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tell us about yourself</CardTitle>
        <CardDescription>
          This helps us personalize your experience
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4 mb-6">
          <Avatar className="h-20 w-20">
            <AvatarImage src={userData.profileImage} />
            <AvatarFallback>
              {userData.fullName
                ?.split(" ")
                .map((n: string) => n[0])
                .join("") || "YN"}
            </AvatarFallback>
          </Avatar>
          <Button variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Upload Photo
          </Button>
        </div>

        <div className="space-y-2">
          <Label htmlFor="fullName">Full Name</Label>
          <Input
            id="fullName"
            value={userData.fullName}
            onChange={(e) =>
              setUserData({ ...userData, fullName: e.target.value })
            }
            placeholder="John Doe"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phoneNumber">Phone Number</Label>
          <Input
            id="phoneNumber"
            type="tel"
            value={userData.phoneNumber}
            onChange={(e) =>
              setUserData({ ...userData, phoneNumber: e.target.value })
            }
            placeholder="(555) 123-4567"
          />
        </div>
      </CardContent>
    </Card>
  );
}

function BusinessStep({ userData, setUserData }: any) {
  const businessTypes = [
    { id: "sole", label: "Sole Proprietor", icon: User },
    { id: "llc", label: "LLC", icon: Building2 },
    { id: "corp", label: "Corporation", icon: Briefcase },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Business Information</CardTitle>
        <CardDescription>
          Help us understand your business better
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="companyName">Company Name</Label>
          <Input
            id="companyName"
            value={userData.companyName}
            onChange={(e) =>
              setUserData({ ...userData, companyName: e.target.value })
            }
            placeholder="ABC Cleaning Services"
          />
        </div>

        <div className="space-y-2">
          <Label>Business Type</Label>
          <div className="grid grid-cols-3 gap-3">
            {businessTypes.map((type) => {
              const Icon = type.icon;
              return (
                <Card
                  key={type.id}
                  className={`cursor-pointer transition-all ${
                    userData.businessType === type.id
                      ? "border-accent-primary bg-accent-primary/5"
                      : "hover:border-border-hover"
                  }`}
                  onClick={() =>
                    setUserData({ ...userData, businessType: type.id })
                  }
                >
                  <CardContent className="p-4 text-center">
                    <Icon className="h-6 w-6 mx-auto mb-2 text-text-secondary" />
                    <p className="text-sm font-medium">{type.label}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="projectSize">Average Project Size</Label>
            <Input
              id="projectSize"
              type="number"
              value={userData.averageProjectSize}
              onChange={(e) =>
                setUserData({ ...userData, averageProjectSize: e.target.value })
              }
              placeholder="$5,000"
              className="pl-8"
            />
            <DollarSign className="absolute left-3 top-9 h-4 w-4 text-text-tertiary" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="monthlyEstimates">Estimates per Month</Label>
            <Input
              id="monthlyEstimates"
              type="number"
              value={userData.monthlyEstimates}
              onChange={(e) =>
                setUserData({ ...userData, monthlyEstimates: e.target.value })
              }
              placeholder="20"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ServicesStep({ userData, onServiceToggle }: any) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>What services do you offer?</CardTitle>
        <CardDescription>
          Select all that apply - you can change these later
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {SERVICE_OPTIONS.map((service) => (
            <div
              key={service.id}
              className={`relative cursor-pointer rounded-lg border-2 p-4 text-center transition-all ${
                userData.selectedServices.includes(service.id)
                  ? "border-accent-primary bg-accent-primary/5"
                  : "border-border-primary hover:border-border-hover"
              }`}
              onClick={() => onServiceToggle(service.id)}
            >
              <Checkbox
                checked={userData.selectedServices.includes(service.id)}
                className="absolute top-2 right-2"
              />
              <div className="text-2xl mb-1">{service.icon}</div>
              <p className="text-sm font-medium">{service.label}</p>
            </div>
          ))}
        </div>

        {userData.selectedServices.length > 0 && (
          <div className="mt-4 p-3 bg-success-subtle rounded-lg">
            <p className="text-sm text-success-primary">
              Great! You&apos;ve selected {userData.selectedServices.length}{" "}
              services. We&apos;ll configure calculators for each one.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function FeaturesStep() {
  const features = [
    {
      icon: Camera,
      title: "Photo Analysis",
      description:
        "Take photos and let AI measure areas and identify services needed",
    },
    {
      icon: FileText,
      title: "Smart Templates",
      description: "Use pre-built templates or save your own for repeat jobs",
    },
    {
      icon: Bot,
      title: "AI Assistant",
      description: "Get smart suggestions for pricing, services, and timelines",
    },
    {
      icon: DollarSign,
      title: "Real-time Pricing",
      description: "See costs update live as you build your estimate",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Powerful Features at Your Fingertips</CardTitle>
        <CardDescription>
          Here&apos;s what makes EstimatePro special
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {features.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex gap-4 p-4 bg-bg-subtle rounded-lg"
            >
              <div className="p-2 bg-accent-primary/10 rounded-lg h-fit">
                <Icon className="h-6 w-6 text-accent-primary" />
              </div>
              <div>
                <h4 className="font-medium mb-1">{feature.title}</h4>
                <p className="text-sm text-text-secondary">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function CompleteStep({ userData }: any) {
  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 p-4 bg-success-subtle rounded-full w-fit">
          <CheckCircle className="h-12 w-12 text-success-primary" />
        </div>
        <CardTitle className="text-3xl">You&apos;re All Set!</CardTitle>
        <CardDescription className="text-lg">
          Welcome to EstimatePro, {userData.fullName || "there"}!
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-4 bg-bg-subtle rounded-lg space-y-3">
          <h4 className="font-medium">Your Setup Summary:</h4>
          <div className="space-y-2 text-sm">
            <p className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-success-primary" />
              Company: {userData.companyName || "Your Business"}
            </p>
            <p className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-success-primary" />
              Services: {userData.selectedServices.length} configured
            </p>
            <p className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-success-primary" />
              AI features enabled
            </p>
          </div>
        </div>

        <div className="text-center space-y-2">
          <p className="text-lg font-medium">
            Ready to create your first estimate?
          </p>
          <p className="text-text-secondary">
            We&apos;ll guide you through the process step by step.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <Badge variant="secondary" className="mb-2">
              Quick
            </Badge>
            <p className="text-xs text-text-secondary">2 min estimates</p>
          </div>
          <div>
            <Badge variant="secondary" className="mb-2">
              Guided
            </Badge>
            <p className="text-xs text-text-secondary">AI assistance</p>
          </div>
          <div>
            <Badge variant="secondary" className="mb-2">
              Templates
            </Badge>
            <p className="text-xs text-text-secondary">Save time</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
