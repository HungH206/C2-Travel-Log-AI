import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-4xl font-bold mb-4">Welcome to EcoRoute AI</h1>
      <p className="text-lg text-muted-foreground mb-8">Your Green Travel Companion</p>
      <Link href="/dashboard" className="bg-primary text-primary-foreground font-semibold py-3 px-6 rounded-md hover:bg-primary/90">
        Go to Dashboard
      </Link>
    </div>
  );
}
