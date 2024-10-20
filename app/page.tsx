import UploadComponent from "../components/component/upload";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { BrainCircuit, LineChart, Lightbulb } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="container mx-auto px-4 py-16">
        <section className="text-center mb-16">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            CAPSTAN
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Provoke thought and make sound investment decisions with AI-powered
            questions from investment experts.
          </p>
        </section>

        <section className="mb-16">
          <Card className="bg-card">
            <CardHeader>
              <CardTitle>Upload Your Investment Data</CardTitle>
              <CardDescription>
                We will analyze your data and generate insightful questions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UploadComponent />
            </CardContent>
          </Card>
        </section>

        <section className="grid md:grid-cols-3 gap-8 mb-16">
          <Card>
            <CardHeader>
              <BrainCircuit className="w-8 h-8 mb-2 text-primary" />
              <CardTitle>AI-Powered Analysis</CardTitle>
              <CardDescription>
                Our advanced AI algorithms analyze your investment data to
                generate targeted questions.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <LineChart className="w-8 h-8 mb-2 text-primary" />
              <CardTitle>Expert Insights</CardTitle>
              <CardDescription>
                Benefit from the collective wisdom of top investment experts in
                your decision-making process.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <Lightbulb className="w-8 h-8 mb-2 text-primary" />
              <CardTitle>Thought-Provoking Questions</CardTitle>
              <CardDescription>
                Receive questions that challenge your assumptions and help you
                consider all angles.
              </CardDescription>
            </CardHeader>
          </Card>
        </section>

        <section className="text-center">
          <h2 className="text-2xl font-semibold mb-4">
            Ready to elevate your investment strategy?
          </h2>
          <Button size="lg">Get Started</Button>
        </section>
      </main>

      <footer className="border-t border-border mt-16 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; 2023 CAPSTAN. All rights reserved.</p>
          <p className="mt-2">Empowering investors with AI-driven insights.</p>
        </div>
      </footer>
    </div>
  );
}
