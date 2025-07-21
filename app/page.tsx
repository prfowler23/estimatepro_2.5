import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Calculator,
  FileText,
  BarChart3,
  Users,
  Shield,
  Zap,
  ArrowRight,
  Building2,
  CheckCircle,
  Bot,
} from "lucide-react";

export default function HomePage() {
  return (
    <div>
      {/* Hero Section */}
      <section className="bg-primary-action text-white py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl font-bold mb-6">
              Professional Building Services Estimating
            </h1>
            <p className="text-xl mb-8 text-primary-foreground/80">
              Create accurate quotes for window cleaning, pressure washing, and
              restoration services in minutes
            </p>
            <div className="flex gap-4 justify-center">
              <Link href="/estimates/new/guided">
                <Button
                  size="lg"
                  className="bg-secondary hover:bg-secondary/90"
                >
                  <Bot className="mr-2 h-5 w-5" />
                  Create AI Estimate
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button
                  size="lg"
                  variant="outline"
                  className="text-white border-white hover:bg-bg-base/10"
                >
                  View Dashboard
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-bg-base">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">
            Why Choose EstimatePro?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <Calculator className="h-10 w-10 text-accent mb-4" />
                <CardTitle>Accurate Calculations</CardTitle>
                <CardDescription>
                  Industry-specific formulas for precise estimates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-secondary mt-0.5" />
                    <span className="text-sm">Labor hours calculation</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-secondary mt-0.5" />
                    <span className="text-sm">Equipment requirements</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-secondary mt-0.5" />
                    <span className="text-sm">Material costs</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Zap className="h-10 w-10 text-accent mb-4" />
                <CardTitle>Fast & Efficient</CardTitle>
                <CardDescription>
                  Create professional quotes in minutes, not hours
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-secondary mt-0.5" />
                    <span className="text-sm">Quick service selection</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-secondary mt-0.5" />
                    <span className="text-sm">Auto-calculations</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-secondary mt-0.5" />
                    <span className="text-sm">PDF generation</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Shield className="h-10 w-10 text-accent mb-4" />
                <CardTitle>Secure & Reliable</CardTitle>
                <CardDescription>
                  Your data is safe with enterprise-grade security
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-secondary mt-0.5" />
                    <span className="text-sm">Encrypted storage</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-secondary mt-0.5" />
                    <span className="text-sm">Regular backups</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-secondary mt-0.5" />
                    <span className="text-sm">Access controls</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-20 bg-muted">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">
            Supported Services
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            <div className="bg-bg-base p-6 rounded-lg border border-border">
              <Building2 className="h-8 w-8 text-accent mb-3" />
              <h3 className="font-semibold mb-2">Glass Restoration</h3>
              <p className="text-sm text-muted-foreground">
                Mineral deposit removal
              </p>
            </div>
            <div className="bg-bg-base p-6 rounded-lg border border-border">
              <Building2 className="h-8 w-8 text-accent mb-3" />
              <h3 className="font-semibold mb-2">Window Cleaning</h3>
              <p className="text-sm text-muted-foreground">
                Commercial & residential
              </p>
            </div>
            <div className="bg-bg-base p-6 rounded-lg border border-border">
              <Building2 className="h-8 w-8 text-accent mb-3" />
              <h3 className="font-semibold mb-2">Pressure Washing</h3>
              <p className="text-sm text-muted-foreground">
                Facades & surfaces
              </p>
            </div>
            <div className="bg-bg-base p-6 rounded-lg border border-border">
              <Building2 className="h-8 w-8 text-accent mb-3" />
              <h3 className="font-semibold mb-2">And More...</h3>
              <p className="text-sm text-muted-foreground">
                11 service types total
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6">
            Ready to Streamline Your Estimating?
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join hundreds of building service contractors who trust EstimatePro
            for accurate, professional quotes
          </p>
          <Link href="/estimates/new/guided">
            <Button size="lg" className="bg-secondary hover:bg-secondary/90">
              <Bot className="mr-2 h-5 w-5" />
              Create Your First AI Estimate
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
